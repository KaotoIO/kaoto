import {
  Button,
  ComposedModal,
  Form,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioButton,
  RadioButtonGroup,
  Stack,
  TextInput,
} from '@carbon/react';
import { FunctionComponent, SyntheticEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { CATALOG_URL } from '../../catalog-url';
import { useFiles } from '../../hooks/useFiles';
import { buildFilePath } from '../../services/files/file-path';
import {
  fetchStarterTemplate,
  resolveStarterTemplate,
  StarterTemplateName,
} from '../../services/templates/starter-templates';

interface FileKind {
  id: string;
  label: string;
  extension: string;
  template: StarterTemplateName;
}

const FILE_KINDS: FileKind[] = [
  { id: 'camel-route', label: 'Camel Route', extension: '.camel.yaml', template: 'camel-route-yaml' },
  { id: 'kamelet', label: 'Kamelet', extension: '.kamelet.yaml', template: 'kamelet-source-yaml' },
  { id: 'pipe', label: 'Pipe', extension: '.pipe.yaml', template: 'pipe-yaml' },
];

const FORM_ID = 'cs--create-file-form';

interface CreateFileModalProps {
  onClose: () => void;
}

/**
 * Creates a file from a starter template of the catalog, stores it and opens it.
 *
 * Render it only while it is open, so that every opening starts with an empty form.
 */
export const CreateFileModal: FunctionComponent<CreateFileModalProps> = ({ onClose }) => {
  const { files, createFile } = useFiles();
  const navigate = useNavigate();
  const [kind, setKind] = useState(FILE_KINDS[0]);
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<string>();

  const result = buildFilePath(folder, name, kind.extension);
  const pathTaken = 'path' in result && files.some((file) => file.path === result.path);
  const nameError = name.trim() && 'field' in result && result.field === 'name' ? result.error : undefined;
  const folderError = 'field' in result && result.field === 'folder' ? result.error : undefined;
  const canCreate = 'path' in result && !pathTaken && !creating;

  const create = async () => {
    if (!('path' in result) || !canCreate) return;
    setCreating(true);
    setFailure(undefined);
    try {
      const template = await fetchStarterTemplate(CATALOG_URL, kind.template);
      const fileName = result.path.split('/').pop()!;
      const created = await createFile({ path: result.path, content: resolveStarterTemplate(template, fileName) });
      onClose();
      void navigate(`/workspace/file/${created.id}`);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      setCreating(false);
    }
  };

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    void create();
  };

  return (
    <ComposedModal
      open
      size="sm"
      onClose={() => {
        onClose();
        return true;
      }}
      preventCloseOnClickOutside
      className="cs--create-file-modal"
      data-testid="create-file-modal"
    >
      <ModalHeader title="Create New File" />
      <ModalBody hasForm>
        <Form
          id={FORM_ID}
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            // The submit button sits in the footer, outside the form, so Enter in a field does not always submit
            if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type === 'text') {
              handleSubmit(event);
            }
          }}
          aria-label="Create New File"
        >
          <Stack gap={6}>
            <RadioButtonGroup
              legendText="File type"
              name="file-type"
              orientation="vertical"
              valueSelected={kind.id}
              onChange={(value) => {
                setKind(FILE_KINDS.find((candidate) => candidate.id === value) ?? FILE_KINDS[0]);
              }}
            >
              {FILE_KINDS.map((candidate) => (
                <RadioButton
                  key={candidate.id}
                  id={`cs--create-file-kind-${candidate.id}`}
                  labelText={candidate.label}
                  value={candidate.id}
                />
              ))}
            </RadioButtonGroup>
            <TextInput
              id="cs--create-file-name"
              labelText="File name"
              placeholder={`e.g. orders${kind.extension}`}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              invalid={!!nameError || pathTaken}
              invalidText={pathTaken ? 'A file with this path already exists' : nameError}
              helperText={'path' in result && !pathTaken ? `Creates ${result.path}` : undefined}
              autoComplete="off"
            />
            <TextInput
              id="cs--create-file-folder"
              labelText="Folder path (optional)"
              placeholder="e.g. routes/subdir/"
              value={folder}
              onChange={(event) => {
                setFolder(event.target.value);
              }}
              invalid={!!folderError}
              invalidText={folderError}
              autoComplete="off"
            />
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
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" type="submit" form={FORM_ID} disabled={!canCreate}>
          {creating ? 'Creating…' : 'Create'}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
