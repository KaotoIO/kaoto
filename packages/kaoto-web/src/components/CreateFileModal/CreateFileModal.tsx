import './CreateFileModal.scss';

import { Button, Form, InlineNotification, Stack, TextInput } from '@carbon/react';
import { FunctionComponent, SyntheticEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { CATALOG_URL } from '../../catalog-url';
import { fileUrl } from '../../routes/file-url';
import { buildFilePath } from '../../services/files/file-path';
import { fetchStarterTemplate, resolveStarterTemplate } from '../../services/templates/starter-templates';
import { FileEntry } from '../../store/files/files-ui-state';
import { useFilesUiStore, useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { KaotoModal } from '../KaotoModal/KaotoModal';
import { LoadingInlineState } from '../LoadingState/LoadingInlineState';
import { FILE_KINDS, FileKind } from './file-kinds';
import { FileKindTiles } from './FileKindTiles';

const FORM_ID = 'cs--create-file-form';

/**
 * The spinner in the icon slot of the Create button. Carbon renders `renderIcon` as a component, so it is defined
 * once here: a new function on every render would be a new component type, which remounts the spinner.
 * It is hidden from assistive tech, since the button text already tells that the file is being created.
 */
const CreatingSpinner: FunctionComponent = () => (
  <span aria-hidden="true">
    <LoadingInlineState compact />
  </span>
);

interface CreateFileModalProps {
  /** Called when the modal closes, with the file it created, or without one when it was cancelled */
  onClose: (created?: FileEntry) => void;
}

/**
 * Creates a file from a starter template of the catalog, stores it and opens it.
 *
 * Render it only while it is open, so that every opening starts with an empty form.
 */
export const CreateFileModal: FunctionComponent<CreateFileModalProps> = ({ onClose }) => {
  const entries = useFilesUiStore((state) => state.entries);
  const store = useFilesUiStoreApi();
  const navigate = useNavigate();
  // The most common type is chosen up front, so that the name can be typed right away
  const [kind, setKind] = useState<FileKind>(FILE_KINDS[0]);
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<string>();
  /** Set once the modal is closed or unmounted, so that a creation still in progress stops */
  const closedRef = useRef(false);

  useEffect(() => {
    // StrictMode runs the effect, its cleanup and the effect again, so the flag is reset on every run
    closedRef.current = false;
    return () => {
      closedRef.current = true;
    };
  }, []);

  const close = (created?: FileEntry) => {
    closedRef.current = true;
    onClose(created);
  };

  const cancel = () => {
    close();
  };

  const result = buildFilePath(folder, name, kind.extension);
  const path = 'path' in result ? result.path : undefined;
  const pathTaken = !!path && entries.some((entry) => entry.path === path);
  const nameError = name.trim() && 'field' in result && result.field === 'name' ? result.error : undefined;
  const folderError = 'field' in result && result.field === 'folder' ? result.error : undefined;
  const canCreate = !!path && !pathTaken && !creating;
  const KindIcon = kind.icon;

  const create = async () => {
    if (!path || !canCreate) return;
    setCreating(true);
    setFailure(undefined);
    try {
      const template = await fetchStarterTemplate(CATALOG_URL, kind.template);
      // Cancelled while the template was loading: create nothing
      if (closedRef.current) return;
      const fileName = path.split('/').pop()!;
      const created = await store.getState().addFile(path, resolveStarterTemplate(template, fileName));
      // Cancelled while storing: the file is kept, it is already in the store and shows in the Explorer
      if (closedRef.current) return;
      close(created);
      void navigate(fileUrl(created.path));
    } catch (error) {
      if (closedRef.current) return;
      setFailure(error instanceof Error ? error.message : String(error));
      setCreating(false);
    }
  };

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    void create();
  };

  return (
    <KaotoModal
      title="Create new file"
      onClose={cancel}
      size="sm"
      hasForm
      preventCloseOnClickOutside
      selectorPrimaryFocus="#cs--create-file-name"
      className="cs--create-file-modal"
      data-testid="create-file-modal"
      footer={
        <>
          <Button kind="secondary" onClick={cancel}>
            Cancel
          </Button>
          <Button
            kind="primary"
            type="submit"
            form={FORM_ID}
            disabled={!canCreate}
            renderIcon={creating ? CreatingSpinner : undefined}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <Form
        id={FORM_ID}
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          // The submit button sits in the footer, outside the form, so Enter in a field does not always submit
          // Enter that confirms an IME composition only finishes the text, it does not submit
          if (
            event.key === 'Enter' &&
            !event.nativeEvent.isComposing &&
            event.target instanceof HTMLInputElement &&
            event.target.type === 'text'
          ) {
            handleSubmit(event);
          }
        }}
        aria-label="Create new file"
      >
        <Stack gap={6}>
          <FileKindTiles
            kinds={FILE_KINDS}
            selected={kind}
            // The file is created with the values from the moment Create was pressed
            disabled={creating}
            onChange={setKind}
          />
          <TextInput
            id="cs--create-file-name"
            labelText="File name"
            placeholder={`e.g. orders${kind.extension}`}
            disabled={creating}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            invalid={!!nameError || pathTaken}
            invalidText={pathTaken ? 'A file with this path already exists' : nameError}
            autoComplete="off"
          />
          <TextInput
            id="cs--create-file-folder"
            labelText="Folder path (optional)"
            placeholder="e.g. routes/subdir/"
            disabled={creating}
            value={folder}
            onChange={(event) => {
              setFolder(event.target.value);
            }}
            invalid={!!folderError}
            invalidText={folderError}
            autoComplete="off"
          />
          {/* The file that Create makes, from the name and the folder together; the space stays when there is none */}
          <div className="cs--create-file-modal__preview-area">
            {path && !pathTaken && (
              <p className="cs--create-file-modal__preview" data-testid="create-file-preview">
                <KindIcon
                  className={`cs--create-file-modal__type-icon cs--create-file-modal__type-icon--${kind.id}`}
                  aria-hidden
                />
                <strong>{path}</strong>
              </p>
            )}
          </div>
          {failure && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Could not create the file"
              subtitle={failure}
            />
          )}
        </Stack>
      </Form>
    </KaotoModal>
  );
};
