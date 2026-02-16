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
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useEffect, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { IField } from '../../../models/datamapper/document';
import { IFieldTypeInfo, TypeOverrideVariant } from '../../../models/datamapper/types';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';

export type TypeOverrideModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedType: IFieldTypeInfo) => void;
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
  const { mappingTree } = useDataMapper();
  const [selectedType, setSelectedType] = useState<IFieldTypeInfo | null>(null);
  const [typeCandidates, setTypeCandidates] = useState<Record<string, IFieldTypeInfo>>({});
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  useEffect(() => {
    if (isOpen && field) {
      const namespaceMap = mappingTree.namespaceMap;
      // For JSON Schema or fields without safe candidates, use all available types
      let candidates = FieldTypeOverrideService.getSafeOverrideCandidates(field, namespaceMap);
      if (Object.keys(candidates).length === 0) {
        candidates = FieldTypeOverrideService.getAllOverrideCandidates(field.ownerDocument, namespaceMap);
      }
      setTypeCandidates(candidates);

      // If field has an existing override, pre-select it
      if (field.typeOverride === TypeOverrideVariant.SAFE || field.typeOverride === TypeOverrideVariant.FORCE) {
        // Use the current type (which is the overridden type)
        const currentTypeString = field.typeQName?.toString() || field.type;
        // Find the matching candidate - candidates is keyed by typeString
        const currentTypeInfo = candidates[currentTypeString];
        if (currentTypeInfo) {
          setSelectedType(currentTypeInfo);
        } else {
          // Fallback: try to find by displayName matching the type
          const fallbackTypeInfo = Object.values(candidates).find(
            (candidate) => candidate.displayName === field.type || candidate.typeString.includes(field.type),
          );
          setSelectedType(fallbackTypeInfo || null);
        }
      } else {
        setSelectedType(null);
      }
    }
  }, [isOpen, field, mappingTree.namespaceMap]);

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

  const handleSave = useCallback(() => {
    if (selectedType) {
      onSave(selectedType);
    }
  }, [selectedType, onSave]);

  const handleRemove = useCallback(() => {
    onRemove();
  }, [onRemove]);

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

          <FormGroup label="" fieldId="type-select" isRequired>
            <Select
              id="type-select"
              isOpen={isSelectOpen}
              selected={selectedType?.typeString}
              onSelect={handleTypeSelect}
              onOpenChange={(isOpen) => setIsSelectOpen(isOpen)}
              toggle={renderToggle}
            >
              <SelectList>
                {Object.entries(typeCandidates).map(([typeString, typeInfo]) => (
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
        </Form>
      </ModalBody>
      <ModalFooter>
        {hasExistingOverride && (
          <Button key="remove" variant="danger" onClick={handleRemove} style={{ marginRight: 'auto' }}>
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

// Made with Bob
