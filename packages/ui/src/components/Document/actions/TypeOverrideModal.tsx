import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  InputGroup,
  InputGroupItem,
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
  TextInput,
} from '@patternfly/react-core';
import { FileImportIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useContext, useEffect, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { IField, SCHEMA_FILE_NAME_PATTERN_XML } from '../../../models/datamapper/document';
import { IFieldTypeInfo, TypeOverrideVariant } from '../../../models/datamapper/types';
import { MetadataContext } from '../../../providers';
import { DataMapperMetadataService } from '../../../services/datamapper-metadata.service';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { XmlSchemaDocumentUtilService } from '../../../services/xml-schema-document-util.service';
import { XmlSchemaCollection } from '../../../xml-schema-ts';
import { getFileExtension, getFileName, validateFileExtension, validateNoMixedTypes } from './AttachSchema/utils';

function getSchemaUploadHelperText(uploadedCount: number): string {
  if (uploadedCount > 0) {
    return `${uploadedCount} schema file(s) uploaded`;
  }
  return 'Upload additional XML schema files to access more types for override.';
}

export type TypeOverrideModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    selectedType: IFieldTypeInfo,
    variant: TypeOverrideVariant.SAFE | TypeOverrideVariant.FORCE,
    supplementarySchemas?: Record<string, string>,
  ) => void;
  onRemove: () => void;
  field: IField;
};

export const TypeOverrideModal: FunctionComponent<TypeOverrideModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onRemove,
  field,
}) => {
  const api = useContext(MetadataContext)!;
  const { mappingTree } = useDataMapper();
  const [selectedType, setSelectedType] = useState<IFieldTypeInfo | null>(null);
  const [typeCandidates, setTypeCandidates] = useState<Record<string, IFieldTypeInfo>>({});
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [supplementarySchemas, setSupplementarySchemas] = useState<Record<string, string>>({});
  const [uploadedSchemaNames, setUploadedSchemaNames] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  useEffect(() => {
    if (isOpen && field) {
      loadTypeCandidates();
    }
  }, [isOpen, field, loadTypeCandidates]);

  // Clean up state when modal closes
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      setSupplementarySchemas({});
      setUploadedSchemaNames([]);
      setUploadError(null);
      setSelectedType(null);
      setIsSelectOpen(false);
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
        if (supplementarySchemas[path]) continue;

        const content = await api.getResourceContent(path);
        if (!content) {
          setUploadError(`Failed to read: ${getFileName(path)}`);
          return null;
        }
        newSchemas[path] = content;
      }
      return newSchemas;
    },
    [api, supplementarySchemas],
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

      try {
        const tempCollection = new XmlSchemaCollection();
        XmlSchemaDocumentUtilService.loadXmlSchemaFiles(tempCollection, newSchemas);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        setUploadError(`Invalid XML schema: ${message}`);
        return;
      }

      setSupplementarySchemas((prev) => ({ ...prev, ...newSchemas }));
      setUploadedSchemaNames((prev) => [...prev, ...Object.keys(newSchemas).map(getFileName)]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setUploadError(`Failed to upload: ${message}`);
    }
  }, [api, supplementarySchemas, field, readSchemaFiles]);

  const handleSave = useCallback(() => {
    if (selectedType) {
      onSave(selectedType, TypeOverrideVariant.SAFE, supplementarySchemas);
    }
  }, [selectedType, supplementarySchemas, onSave]);

  const handleModalClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

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
      isOpen={isOpen}
      onClose={onClose}
      onClick={handleModalClick}
      appendTo={() => document.body}
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

          <FormGroup label="Upload Additional Schema Files (Optional)" fieldId="schema-upload">
            <InputGroup>
              <InputGroupItem isFill>
                <TextInput
                  type="text"
                  id="uploaded-schemas-display"
                  readOnly
                  value={uploadedSchemaNames.join(', ')}
                  placeholder="No additional schemas uploaded"
                />
              </InputGroupItem>
              <InputGroupItem>
                <Button
                  icon={<FileImportIcon />}
                  onClick={handleSchemaUpload}
                  aria-label="Upload schema file"
                  data-testid="upload-schema-button"
                >
                  Upload
                </Button>
              </InputGroupItem>
            </InputGroup>
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={uploadError ? 'error' : undefined}>
                  {uploadError || getSchemaUploadHelperText(uploadedSchemaNames.length)}
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
