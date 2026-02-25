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
import { FileImportIcon, LinkIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { IField, SCHEMA_FILE_NAME_PATTERN_XML } from '../../../models/datamapper/document';
import { IFieldTypeInfo, TypeOverrideVariant } from '../../../models/datamapper/types';
import { MetadataContext } from '../../../providers';
import { DataMapperMetadataService } from '../../../services/datamapper-metadata.service';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { getFileExtension, getFileName, validateFileExtension, validateNoMixedTypes } from './AttachSchema/utils';
import { SchemaFileList } from './SchemaFileList';

export type TypeOverrideModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedType: IFieldTypeInfo | null) => void;
  onAttach: (schemas: Record<string, string>) => void;
  onRemove: () => void;
  field: IField;
};

export const TypeOverrideModal: FunctionComponent<TypeOverrideModalProps> = ({
  isOpen,
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
  const [supplementarySchemas, setSupplementarySchemas] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const existingFiles = useMemo(
    () => Object.keys(field?.ownerDocument?.definition?.definitionFiles ?? {}),
    [field?.ownerDocument?.definition?.definitionFiles],
  );
  const pendingUploads = useMemo(
    () => Object.keys(supplementarySchemas).filter((path) => !existingFiles.includes(path)),
    [supplementarySchemas, existingFiles],
  );

  const loadTypeCandidates = useCallback(() => {
    if (!field) return;

    const namespaceMap = mappingTree.namespaceMap;

    // Get safe type candidates (extensions/restrictions of the field's type, or all types for anyType)
    const candidates = FieldTypeOverrideService.getSafeOverrideCandidates(field, namespaceMap);
    setTypeCandidates(candidates);

    // If field has an existing override, pre-select it by matching namespace URI + local part
    if (field.typeOverride !== TypeOverrideVariant.NONE && field.typeQName) {
      const nsURI = field.typeQName.getNamespaceURI();
      const localPart = field.typeQName.getLocalPart();
      const prefix = Object.entries(namespaceMap).find(([, uri]) => uri === nsURI)?.[0] || '';
      const typeString = prefix ? `${prefix}:${localPart}` : String(localPart);
      setSelectedType(candidates[typeString] || null);
    } else {
      setSelectedType(null);
    }
  }, [field, mappingTree.namespaceMap]);

  // Reload type candidates when the modal opens, or when definition files change (e.g., after schema attachment)
  useEffect(() => {
    if (isOpen && field) {
      loadTypeCandidates();
    }
  }, [isOpen, field, loadTypeCandidates, existingFiles]);

  // Clean up transient state when modal closes
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      setUploadError(null);
      setSelectedType(null);
      setIsSelectOpen(false);
      setSupplementarySchemas({});
    };
  }, [isOpen]);

  // Prevent @dnd-kit drag activation when modal is open
  // React synthetic events from portals bubble through the React tree, not DOM tree.
  // Since this modal is rendered inside a draggable component, mousedown events
  // would bubble to the useDraggable listeners. We use native capture-phase listeners
  // to intercept events BEFORE they reach React's synthetic event system.
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

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
        if (supplementarySchemas[path] || existingFiles.includes(path)) continue;

        const content = await api.getResourceContent(path);
        if (!content) {
          setUploadError(`Failed to read: ${getFileName(path)}`);
          return null;
        }
        newSchemas[path] = content;
      }
      return newSchemas;
    },
    [api, supplementarySchemas, existingFiles],
  );

  const handleSchemaUpload = useCallback(async () => {
    setUploadError(null);

    try {
      const paths = await DataMapperMetadataService.selectDocumentSchema(api, SCHEMA_FILE_NAME_PATTERN_XML);
      if (!paths || (Array.isArray(paths) && paths.length === 0)) return;

      const newPaths = Array.isArray(paths) ? paths : [paths];

      const firstExt = getFileExtension(newPaths[0]);
      const extensionError = validateFileExtension(firstExt, field.ownerDocument.definition.documentType);
      if (extensionError) {
        setUploadError(extensionError);
        return;
      }

      const mixedTypeError = validateNoMixedTypes(firstExt, Object.keys(supplementarySchemas));
      if (mixedTypeError) {
        setUploadError(mixedTypeError);
        return;
      }

      const newSchemas = await readSchemaFiles(newPaths);
      if (!newSchemas || Object.keys(newSchemas).length === 0) return;

      setSupplementarySchemas((prev) => ({ ...prev, ...newSchemas }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setUploadError(`Failed to upload: ${message}`);
    }
  }, [api, supplementarySchemas, field, readSchemaFiles]);

  const handleRemoveUpload = useCallback((filePath: string) => {
    setSupplementarySchemas((prev) => {
      const next = { ...prev };
      delete next[filePath];
      return next;
    });
    setUploadError(null);
  }, []);

  const handleAttach = useCallback(() => {
    const pendingSchemas = Object.fromEntries(
      Object.entries(supplementarySchemas).filter(([path]) => !existingFiles.includes(path)),
    );
    if (Object.keys(pendingSchemas).length === 0) return;

    try {
      onAttach(pendingSchemas);
      loadTypeCandidates();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setUploadError(`Invalid schema: ${message}`);
    }
  }, [supplementarySchemas, existingFiles, onAttach, loadTypeCandidates]);

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
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose} appendTo={() => document.body}>
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
              selected={selectedType?.typeString}
              onSelect={handleTypeSelect}
              onOpenChange={(isOpen) => setIsSelectOpen(isOpen)}
              toggle={renderToggle}
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
            <SchemaFileList
              existingFiles={existingFiles}
              pendingUploads={pendingUploads}
              onRemove={handleRemoveUpload}
            />
            <Button
              icon={<FileImportIcon />}
              onClick={handleSchemaUpload}
              aria-label="Upload schema file"
              data-testid="upload-schema-button"
              variant="secondary"
            >
              Upload Schema
            </Button>{' '}
            <Button
              icon={<LinkIcon />}
              onClick={handleAttach}
              aria-label="Attach schemas to document"
              data-testid="attach-schema-button"
              variant="secondary"
              isDisabled={pendingUploads.length === 0}
            >
              Attach to Document
            </Button>
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={uploadError ? 'error' : undefined}>
                  {uploadError || 'Upload schema files, then attach them to the document to make types available.'}
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
