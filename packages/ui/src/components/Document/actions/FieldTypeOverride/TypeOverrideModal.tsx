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
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { FileImportIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField, SCHEMA_FILE_NAME_PATTERN_XML } from '../../../../models/datamapper/document';
import { IFieldTypeInfo, TypeOverrideVariant } from '../../../../models/datamapper/types';
import { MetadataContext } from '../../../../providers';
import { FieldTypeOverrideService } from '../../../../services/field-type-override.service';
import { formatQNameWithPrefix } from '../../../../services/qname-util';
import { getFileName, pickAndValidateSchemaFiles } from '../utils';
import { SchemaFileList } from './SchemaFileList';

export type TypeOverrideModalProps = {
  onClose: () => void;
  onSave: (selectedType: IFieldTypeInfo | null) => void;
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
  const [selectedType, setSelectedType] = useState<IFieldTypeInfo | null>(null);
  const [typeCandidates, setTypeCandidates] = useState<Record<string, IFieldTypeInfo>>({});
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [uploadedSchemas, setUploadedSchemas] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const existingFiles = useMemo(
    () => Object.keys(field?.ownerDocument?.definition?.definitionFiles ?? {}),
    [field?.ownerDocument?.definition?.definitionFiles],
  );

  const loadTypeCandidates = useCallback(() => {
    if (!field) return;

    const namespaceMap = mappingTree.namespaceMap;

    // Get safe type candidates (extensions/restrictions of the field's type, or all types for anyType)
    const candidates = FieldTypeOverrideService.getSafeOverrideCandidates(field, namespaceMap);
    setTypeCandidates(candidates);

    // If field has an existing override, pre-select it by matching namespace URI + local part
    if (field.typeOverride !== TypeOverrideVariant.NONE && field.typeQName) {
      const typeString = formatQNameWithPrefix(field.typeQName, namespaceMap);
      setSelectedType(candidates[typeString] || null);
    } else {
      setSelectedType(null);
    }
  }, [field, mappingTree.namespaceMap]);

  // Reload type candidates on mount and when definition files change (e.g., after schema attachment).
  // `existingFiles` is not used in the effect body but is included as a dependency to trigger a reload
  // when schema files are added — `loadTypeCandidates` itself doesn't depend on definitionFiles.
  useEffect(() => {
    if (field) {
      loadTypeCandidates();
    }
  }, [field, loadTypeCandidates, existingFiles]);

  // Clean up transient state when modal unmounts
  useEffect(() => {
    return () => {
      setUploadError(null);
      setSelectedType(null);
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
      const typeString = value as string;
      const typeInfo = typeCandidates[typeString];
      if (typeInfo) {
        setSelectedType(typeInfo);
      }
      setIsSelectOpen(false);
    },
    [typeCandidates],
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

      // Track uploaded schemas for duplicate detection
      setUploadedSchemas((prev) => ({ ...prev, ...newSchemas }));

      // Immediately attach schemas to document and reload types
      try {
        onAttach(newSchemas);
        // Types will be reloaded automatically via useEffect when existingFiles changes
      } catch (attachError: unknown) {
        const message = attachError instanceof Error ? attachError.message : String(attachError);
        setUploadError(`Invalid schema: ${message}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setUploadError(`Failed to upload: ${message}`);
    }
  }, [api, uploadedSchemas, field, readSchemaFiles, onAttach]);

  const handleSave = useCallback(() => {
    onSave(selectedType);
  }, [selectedType, onSave]);

  const handleToggleSelect = useCallback(() => {
    setIsSelectOpen(!isSelectOpen);
  }, [isSelectOpen]);

  const renderToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} onClick={handleToggleSelect} isExpanded={isSelectOpen} isFullWidth>
        {selectedType?.displayName || 'Select a new type...'}
      </MenuToggle>
    ),
    [handleToggleSelect, isSelectOpen, selectedType?.displayName],
  );

  const hasExistingOverride = field?.typeOverride !== TypeOverrideVariant.NONE;

  const originalTypeDisplay = field?.originalTypeQName?.toString() || field?.originalType || field?.type || 'Unknown';
  const fieldName = field?.displayName || field?.name || 'Field';
  const fieldPath = field?.path?.toString() || '';
  const modalTitle = (
    <>
      <Icon size="md" status="warning" isInline>
        <WrenchIcon />
      </Icon>{' '}
      Type Override: {fieldName}
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

          <FormGroup label="New Type" fieldId="type-select" isRequired>
            <Select
              id="type-select"
              isOpen={isSelectOpen}
              selected={
                selectedType ? formatQNameWithPrefix(selectedType.typeQName, mappingTree.namespaceMap) : undefined
              }
              onSelect={handleTypeSelect}
              onOpenChange={(isOpen) => setIsSelectOpen(isOpen)}
              toggle={renderToggle}
              maxMenuHeight="240px"
              popperProps={{
                preventOverflow: true,
              }}
            >
              <SelectList>
                {Object.entries(typeCandidates)
                  .sort(([, a], [, b]) => a.displayName.localeCompare(b.displayName))
                  .map(([typeString, typeInfo]) => (
                    <SelectOption key={typeString} value={typeString}>
                      {typeInfo.displayName}
                    </SelectOption>
                  ))}
              </SelectList>
            </Select>
            {selectedType?.description && (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>{selectedType.description}</HelperTextItem>
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
        <Button key="save" variant="primary" onClick={handleSave} isDisabled={!selectedType}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
};
