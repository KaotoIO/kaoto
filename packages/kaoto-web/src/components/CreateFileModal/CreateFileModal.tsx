import './CreateFileModal.scss';

import { Chemistry, Cube, DocumentConfiguration, Xml } from '@carbon/icons-react';
import {
  Button,
  ComposedModal,
  Form,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  RadioTile,
  Stack,
  TextInput,
  TileGroup,
} from '@carbon/react';
import { ComponentType, FunctionComponent, SyntheticEvent, useState } from 'react';
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
  description: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  extension: string;
  template: StarterTemplateName;
}

const FILE_KINDS: FileKind[] = [
  {
    id: 'camel-route-yaml',
    label: 'Camel Route YAML',
    description: 'Define an Apache Camel integration route using YAML DSL',
    icon: DocumentConfiguration,
    extension: '.camel.yaml',
    template: 'camel-route-yaml',
  },
  {
    id: 'camel-route-xml',
    label: 'Camel Route XML',
    description: 'Define an Apache Camel integration route using XML DSL',
    icon: Xml,
    extension: '.camel.xml',
    template: 'camel-route-xml',
  },
  {
    id: 'kamelet',
    label: 'Kamelet',
    description: 'Reusable Camel route template with a well-defined interface',
    icon: Cube,
    extension: '.kamelet.yaml',
    template: 'kamelet-source-yaml',
  },
  {
    id: 'citrus-test',
    label: 'Citrus Test',
    description: 'Integration test using the Citrus testing framework',
    icon: Chemistry,
    extension: '.citrus.yaml',
    template: 'citrus-yaml',
  },
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
  const [kind, setKind] = useState<FileKind>();
  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [creating, setCreating] = useState(false);
  const [failure, setFailure] = useState<string>();

  const result = kind ? buildFilePath(folder, name, kind.extension) : undefined;
  const path = result && 'path' in result ? result.path : undefined;
  const pathTaken = !!path && files.some((file) => file.path === path);
  const nameError = name.trim() && result && 'field' in result && result.field === 'name' ? result.error : undefined;
  const folderError = result && 'field' in result && result.field === 'folder' ? result.error : undefined;
  const canCreate = !!path && !pathTaken && !creating;

  const create = async () => {
    if (!kind || !path || !canCreate) return;
    setCreating(true);
    setFailure(undefined);
    try {
      const template = await fetchStarterTemplate(CATALOG_URL, kind.template);
      const fileName = path.split('/').pop()!;
      const created = await createFile({ path, content: resolveStarterTemplate(template, fileName) });
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
      selectorPrimaryFocus={`#cs--create-file-kind-${FILE_KINDS[0].id}`}
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
            <TileGroup
              legend="File type"
              name="file-type"
              className="cds--tile-group cs--create-file-modal__types"
              valueSelected={kind?.id}
              onChange={(value) => {
                setKind(FILE_KINDS.find((candidate) => candidate.id === value));
              }}
            >
              {FILE_KINDS.map((candidate) => {
                const Icon = candidate.icon;
                return (
                  <RadioTile
                    key={candidate.id}
                    id={`cs--create-file-kind-${candidate.id}`}
                    value={candidate.id}
                    className="cs--create-file-modal__type"
                  >
                    <span className="cs--create-file-modal__type-content">
                      <Icon
                        className={`cs--create-file-modal__type-icon cs--create-file-modal__type-icon--${candidate.id}`}
                        aria-hidden
                      />
                      <span className="cs--create-file-modal__type-text">
                        <span className="cs--create-file-modal__type-label">{candidate.label}</span>
                        <span className="cs--create-file-modal__type-description">{candidate.description}</span>
                      </span>
                    </span>
                  </RadioTile>
                );
              })}
            </TileGroup>
            <TextInput
              id="cs--create-file-name"
              labelText="File name"
              placeholder={kind ? `e.g. orders${kind.extension}` : 'Select a file type first'}
              disabled={!kind}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              invalid={!!nameError || pathTaken}
              invalidText={pathTaken ? 'A file with this path already exists' : nameError}
              helperText={path && !pathTaken ? `Creates ${path}` : undefined}
              autoComplete="off"
            />
            <TextInput
              id="cs--create-file-folder"
              labelText="Folder path (optional)"
              placeholder="e.g. routes/subdir/"
              disabled={!kind}
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
          {creating ? 'Creating…' : 'Create File'}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
