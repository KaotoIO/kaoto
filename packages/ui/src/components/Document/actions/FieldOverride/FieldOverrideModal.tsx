import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { FileImportIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useContext, useEffect, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField, SCHEMA_FILE_NAME_PATTERN_XML } from '../../../../models/datamapper/document';
import { FieldOverrideVariant, IFieldTypeInfo } from '../../../../models/datamapper/types';
import { MetadataContext } from '../../../../providers';
import { formatQNameWithPrefix } from '../../../../services/namespace-util';
import { SchemaPathService } from '../../../../services/schema-path.service';
import { DataMapperModal } from '../../../DataMapper/DataMapperModal';
import { TypeaheadSelect } from '../AttachSchema/TypeaheadSelect';
import { getFileName, pickAndValidateSchemaFiles } from '../utils';
import { CandidateDisplay, CandidateOption, getOverrideCandidates, OverrideMode } from './override-util';
import { SchemaFileList } from './SchemaFileList';

export type OverrideSavePayload =
  | { mode: 'type'; selectedType: IFieldTypeInfo; selectedKey: string }
  | { mode: 'substitution'; selectedKey: string };

export type FieldOverrideModalProps = {
  onClose: () => void;
  onSave: (payload: OverrideSavePayload) => void;
  onAttach: (schemas: Record<string, string>) => void;
  onRemove: () => void;
  field: IField;
};

export const FieldOverrideModal: FunctionComponent<FieldOverrideModalProps> = ({
  onClose,
  onSave,
  onAttach,
  onRemove,
  field,
}) => {
  const api = useContext(MetadataContext)!;
  const { mappingTree } = useDataMapper();
  const isAbstractWrapper = field.wrapperKind === 'abstract';
  const initialMode: OverrideMode =
    field.typeOverride === FieldOverrideVariant.SUBSTITUTION || isAbstractWrapper ? 'substitution' : 'type';
  const initialCandidates = getOverrideCandidates(field, initialMode, mappingTree.namespaceMap);
  const [overrideMode, setOverrideMode] = useState<OverrideMode>(initialMode);
  const [selectedKey, setSelectedKey] = useState<string | null>(initialCandidates.selectedKey);
  const [candidates, setCandidates] = useState<Record<string, CandidateDisplay>>(initialCandidates.candidates);
  const [candidateOptions, setCandidateOptions] = useState<CandidateOption[]>(initialCandidates.options);
  const [uploadedSchemas, setUploadedSchemas] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedCandidate = selectedKey ? (candidates[selectedKey] ?? null) : null;

  const existingFiles = Object.keys(field?.ownerDocument?.definition?.definitionFiles ?? {});

  const reloadCandidates = useCallback(
    (mode: OverrideMode) => {
      if (!field) return;
      const result = getOverrideCandidates(field, mode, mappingTree.namespaceMap);
      setCandidates(result.candidates);
      setCandidateOptions(result.options);
      setSelectedKey(result.selectedKey);
    },
    [field, mappingTree.namespaceMap],
  );

  const handleModeChange = useCallback(
    (mode: OverrideMode) => {
      setOverrideMode(mode);
      reloadCandidates(mode);
    },
    [reloadCandidates],
  );

  // Clean up transient state when modal unmounts
  useEffect(() => {
    return () => {
      setUploadError(null);
      setSelectedKey(null);
      setUploadedSchemas({});
    };
  }, []);

  const handleTypeSelect = useCallback(
    (key: string) => {
      setSelectedKey(key in candidates ? key : null);
    },
    [candidates],
  );

  const readSchemaFiles = useCallback(
    async (paths: string[]): Promise<Record<string, string> | null> => {
      const newSchemas: Record<string, string> = {};
      for (const path of paths) {
        if (uploadedSchemas[path] || existingFiles.includes(path)) continue;

        const content = await api.getResourceContent(path);
        if (!content) {
          setUploadError(`Failed to read: ${getFileName(path)}`);
          return null;
        }
        newSchemas[path] = content;
      }
      return newSchemas;
    },
    [api, uploadedSchemas, existingFiles],
  );

  const handleSchemaUpload = useCallback(async () => {
    setUploadError(null);

    try {
      const { paths: newPaths, error } = await pickAndValidateSchemaFiles(
        api,
        SCHEMA_FILE_NAME_PATTERN_XML,
        field.ownerDocument.definition.documentType,
        Object.keys(uploadedSchemas),
      );

      if (error) {
        setUploadError(error);
        return;
      }

      if (newPaths.length === 0) return;

      const newSchemas = await readSchemaFiles(newPaths);
      if (!newSchemas || Object.keys(newSchemas).length === 0) return;

      // Immediately attach schemas to document and reload types
      try {
        onAttach(newSchemas);
        setUploadedSchemas((prev) => ({ ...prev, ...newSchemas }));
        reloadCandidates(overrideMode);
      } catch (attachError: unknown) {
        const message = attachError instanceof Error ? attachError.message : String(attachError);
        setUploadError(`Invalid schema: ${message}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setUploadError(`Failed to upload: ${message}`);
    }
  }, [api, uploadedSchemas, field, readSchemaFiles, onAttach, reloadCandidates, overrideMode]);

  const handleSave = useCallback(() => {
    if (!selectedKey) return;
    if (overrideMode === 'substitution') {
      onSave({ mode: 'substitution', selectedKey });
    } else {
      const selectedType = candidates[selectedKey] as IFieldTypeInfo | undefined;
      if (selectedType) {
        onSave({ mode: 'type', selectedType, selectedKey });
      }
    }
  }, [selectedKey, overrideMode, candidates, onSave]);

  const isSubstitutionMode = overrideMode === 'substitution';
  const selectLabel = isSubstitutionMode ? 'Substitute Element' : 'New Type';
  const selectPlaceholder = isSubstitutionMode ? 'Select a substitute element...' : 'Select a new type...';

  const hasExistingOverride = field?.typeOverride !== FieldOverrideVariant.NONE || isAbstractWrapper;

  const originalTypeDisplay = formatQNameWithPrefix(
    field?.originalField?.typeQName ?? field?.typeQName,
    mappingTree.namespaceMap,
    field?.originalField?.type ?? field?.type ?? 'Unknown',
  );
  const fieldName = field?.displayName || field?.name || 'Field';
  const fieldPath = SchemaPathService.formatDisplayPath(field, mappingTree.namespaceMap);
  const modalTitle = (
    <>
      <Icon size="md" status="warning" isInline>
        <WrenchIcon />
      </Icon>{' '}
      Field Override: {fieldName}
    </>
  );

  return (
    <DataMapperModal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      appendTo={() => document.body}
      className="field-override-modal"
    >
      <ModalHeader title={modalTitle} />
      <ModalBody>
        <Form>
          <FormGroup>
            <p>
              <strong>Field Path:</strong> {fieldPath}
            </p>
          </FormGroup>

          <FormGroup>
            <p>
              <strong>Original Type:</strong> {originalTypeDisplay}
            </p>
          </FormGroup>

          <FormGroup label="Override Mode" fieldId="override-mode" role="radiogroup">
            <Split hasGutter>
              <SplitItem>
                <Radio
                  id="mode-type"
                  name="override-mode"
                  label="Override Type"
                  isChecked={overrideMode === 'type'}
                  isDisabled={hasExistingOverride && overrideMode !== 'type'}
                  onChange={() => handleModeChange('type')}
                />
              </SplitItem>
              <SplitItem>
                <Radio
                  id="mode-substitution"
                  name="override-mode"
                  label="Substitute Element"
                  isChecked={overrideMode === 'substitution'}
                  isDisabled={hasExistingOverride && overrideMode !== 'substitution'}
                  onChange={() => handleModeChange('substitution')}
                />
              </SplitItem>
            </Split>
          </FormGroup>

          <FormGroup label={selectLabel} fieldId="type-select" isRequired>
            <TypeaheadSelect
              id="type-select"
              data-testid="field-override-type-select"
              value={selectedKey ?? ''}
              onChange={handleTypeSelect}
              options={candidateOptions}
              placeholder={selectPlaceholder}
              ariaLabel={selectPlaceholder}
            />
            {selectedCandidate?.description && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{selectedCandidate.description}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            )}
          </FormGroup>

          <FormGroup label="Document Schema Files" fieldId="schema-upload">
            {/* Removal of individual schema files from this modal is intentionally not supported — files are managed via the document-level attach/detach flow */}
            <SchemaFileList existingFiles={existingFiles} pendingUploads={[]} onRemove={() => {}} />
            <Button
              icon={<FileImportIcon />}
              onClick={handleSchemaUpload}
              aria-label="Upload schema file"
              data-testid="upload-schema-button"
              variant="secondary"
            >
              Upload Schema
            </Button>
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={uploadError ? 'error' : undefined}>
                  {uploadError || 'Upload schema files to add types to the dropdown.'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        {hasExistingOverride && (
          <Button key="remove" variant="danger" onClick={onRemove} style={{ marginRight: 'auto' }}>
            Remove Override
          </Button>
        )}
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button key="save" variant="primary" onClick={handleSave} isDisabled={!selectedKey}>
          Save
        </Button>
      </ModalFooter>
    </DataMapperModal>
  );
};
