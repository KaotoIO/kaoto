import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Radio,
  Select,
  SelectList,
  SelectOption,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { FileImportIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField, SCHEMA_FILE_NAME_PATTERN_XML } from '../../../../models/datamapper/document';
import { FieldOverrideVariant, IFieldTypeInfo } from '../../../../models/datamapper/types';
import { MetadataContext } from '../../../../providers';
import { formatQNameWithPrefix } from '../../../../services/namespace-util';
import { SchemaPathService } from '../../../../services/schema-path.service';
import { getFileName, pickAndValidateSchemaFiles } from '../utils';
import { CandidateDisplay, getOverrideCandidates, OverrideMode } from './override-util';
import { SchemaFileList } from './SchemaFileList';

export type OverrideSavePayload =
  | { mode: 'type'; selectedType: IFieldTypeInfo; selectedKey: string }
  | { mode: 'substitution'; selectedKey: string };

export type TypeOverrideModalProps = {
  onClose: () => void;
  onSave: (payload: OverrideSavePayload) => void;
  onAttach: (schemas: Record<string, string>) => void;
  onRemove: () => void;
  field: IField;
};

export const TypeOverrideModal: FunctionComponent<TypeOverrideModalProps> = ({
  onClose,
  onSave,
  onAttach,
  onRemove,
  field,
}) => {
  const api = useContext(MetadataContext)!;
  const { mappingTree } = useDataMapper();
  const initialMode: OverrideMode = field.typeOverride === FieldOverrideVariant.SUBSTITUTION ? 'substitution' : 'type';
  const initialCandidates = getOverrideCandidates(field, initialMode, mappingTree.namespaceMap);
  const [overrideMode, setOverrideMode] = useState<OverrideMode>(initialMode);
  const [selectedKey, setSelectedKey] = useState<string | null>(initialCandidates.selectedKey);
  const [candidates, setCandidates] = useState<Record<string, CandidateDisplay>>(initialCandidates.candidates);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [uploadedSchemas, setUploadedSchemas] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedCandidate = selectedKey ? (candidates[selectedKey] ?? null) : null;

  const existingFiles = Object.keys(field?.ownerDocument?.definition?.definitionFiles ?? {});

  const reloadCandidates = useCallback(
    (mode: OverrideMode) => {
      if (!field) return;
      const result = getOverrideCandidates(field, mode, mappingTree.namespaceMap);
      setCandidates(result.candidates);
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
      setIsSelectOpen(false);
      setUploadedSchemas({});
    };
  }, []);

  // Prevent @dnd-kit drag activation when modal is open.
  // React synthetic events from portals bubble through the React tree, not DOM tree.
  // Since this modal is rendered inside a draggable component, mousedown events
  // would bubble to the useDraggable listeners. We use native capture-phase listeners
  // to intercept events BEFORE they reach React's synthetic event system.
  useEffect(() => {
    const handleMouseDownCapture = (e: Event) => {
      const target = e.target as HTMLElement;
      // Stop propagation for any click on backdrop or modal content
      if (target.closest('.pf-v6-c-backdrop') || target.closest('.pf-v6-c-modal-box')) {
        e.stopPropagation();
      }
    };

    // Capture phase (third parameter = true) runs before React synthetic events
    document.addEventListener('mousedown', handleMouseDownCapture, true);
    document.addEventListener('pointerdown', handleMouseDownCapture, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDownCapture, true);
      document.removeEventListener('pointerdown', handleMouseDownCapture, true);
    };
  }, []);

  const handleTypeSelect = useCallback(
    (_event: MouseEvent | undefined, value: string | number | undefined) => {
      const key = value as string;
      if (key in candidates) {
        setSelectedKey(key);
      }
      setIsSelectOpen(false);
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

  const handleToggleSelect = useCallback(() => {
    setIsSelectOpen((prev) => !prev);
  }, []);

  const isSubstitutionMode = overrideMode === 'substitution';
  const selectLabel = isSubstitutionMode ? 'Substitute Element' : 'New Type';
  const selectPlaceholder = isSubstitutionMode ? 'Select a substitute element...' : 'Select a new type...';

  const renderToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={handleToggleSelect} isExpanded={isSelectOpen} isFullWidth>
        {selectedCandidate?.displayName || selectPlaceholder}
      </MenuToggle>
    ),
    [handleToggleSelect, isSelectOpen, selectedCandidate?.displayName, selectPlaceholder],
  );

  const sortedCandidates = useMemo(
    () => Object.entries(candidates).sort(([, a], [, b]) => a.displayName.localeCompare(b.displayName)),
    [candidates],
  );

  const hasExistingOverride = field?.typeOverride !== FieldOverrideVariant.NONE;

  const originalTypeDisplay = formatQNameWithPrefix(
    field?.originalField?.typeQName ?? field?.typeQName,
    mappingTree.namespaceMap,
    field?.originalField?.type ?? field?.type ?? 'Unknown',
  );
  const fieldName = field?.displayName || field?.name || 'Field';
  const fieldPath = SchemaPathService.build(field, mappingTree.namespaceMap);
  const modalTitle = (
    <>
      <Icon size="md" status="warning" isInline>
        <WrenchIcon />
      </Icon>{' '}
      Field Override: {fieldName}
    </>
  );

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      appendTo={() => document.body}
      className="type-override-modal"
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
            <Select
              id="type-select"
              isOpen={isSelectOpen}
              selected={selectedKey}
              onSelect={handleTypeSelect}
              onOpenChange={(isOpen) => setIsSelectOpen(isOpen)}
              toggle={renderToggle}
              maxMenuHeight="240px"
              popperProps={{
                preventOverflow: true,
              }}
            >
              <SelectList>
                {sortedCandidates.map(([key, candidate]) => (
                  <SelectOption key={key} value={key}>
                    {candidate.displayName}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
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
    </Modal>
  );
};
