import {
  ActionListItem,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
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
import { AddCircleOIcon, EllipsisVIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useEffect, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { IField } from '../../../models/datamapper/document';
import { ChooseItem } from '../../../models/datamapper/mapping';
import { IFieldTypeInfo, TypeOverrideVariant } from '../../../models/datamapper/types';
import {
  FieldItemNodeData,
  MappingNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../../models/datamapper/visualization';
import { DEFAULT_POPPER_PROPS } from '../../../models/popper-default';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { VisualizationService } from '../../../services/visualization.service';

type TypeOverrideModalProps = {
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
      if (field.typeOverride !== TypeOverrideVariant.NONE) {
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
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsSelectOpen(!isSelectOpen)}
                  isExpanded={isSelectOpen}
                  isFullWidth
                >
                  {selectedType?.displayName || 'Select a new type...'}
                </MenuToggle>
              )}
            >
              <SelectList>
                {Object.entries(typeCandidates).map(([typeString, typeInfo]) => (
                  <SelectOption key={typeString} value={typeString}>
                    {typeInfo.displayName}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
            {selectedType && selectedType.description && (
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

type ConditionMenuProps = {
  dropdownLabel?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

export const ConditionMenuAction: FunctionComponent<ConditionMenuProps> = ({ dropdownLabel, nodeData, onUpdate }) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const [isTypeOverrideModalOpen, setIsTypeOverrideModalOpen] = useState<boolean>(false);
  const { mappingTree, updateDocument } = useDataMapper();
  const allowIfChoose = VisualizationService.allowIfChoose(nodeData);
  const allowForEach = VisualizationService.allowForEach(nodeData);
  const isChooseNode = nodeData instanceof MappingNodeData && nodeData.mapping instanceof ChooseItem;
  const otherwiseItem = isChooseNode && (nodeData.mapping as ChooseItem).otherwise;
  const allowValueSelector = VisualizationService.allowValueSelector(nodeData);
  const hasValueSelector = VisualizationService.hasValueSelector(nodeData);
  const isValueSelectorNode = VisualizationService.isValueSelectorNode(nodeData);
  // Support both TargetFieldNodeData (field without mapping) and FieldItemNodeData (field with mapping)
  const isFieldNode = nodeData instanceof TargetFieldNodeData || nodeData instanceof FieldItemNodeData;
  const field = isFieldNode ? (nodeData as TargetFieldNodeData | FieldItemNodeData).field : undefined;
  const hasTypeOverride = field && field.typeOverride !== TypeOverrideVariant.NONE;

  const onToggleActionMenu = useCallback(
    (_event: MouseEvent | undefined) => {
      setIsActionMenuOpen(!isActionMenuOpen);
    },
    [isActionMenuOpen],
  );

  const onSelectAction = useCallback(
    (event: MouseEvent | undefined, value: string | number | undefined) => {
      event?.stopPropagation();
      switch (value) {
        case 'selector':
          VisualizationService.applyValueSelector(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'if':
          VisualizationService.applyIf(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'choose':
          VisualizationService.applyChooseWhenOtherwise(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'foreach':
          VisualizationService.applyForEach(nodeData as TargetFieldNodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'when':
          VisualizationService.applyWhen(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'otherwise':
          VisualizationService.applyOtherwise(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'type-override':
          setIsTypeOverrideModalOpen(true);
          setIsActionMenuOpen(false);
          break;
        case 'reset-override':
          if (isFieldNode && field) {
            const document = field.ownerDocument;
            const namespaceMap = mappingTree.namespaceMap;
            const previousRefId = document.getReferenceId(namespaceMap);
            FieldTypeOverrideService.revertFieldTypeOverride(document, field, namespaceMap);
            updateDocument(document, document.definition, previousRefId);
            onUpdate();
          }
          setIsActionMenuOpen(false);
          break;
      }
    },
    [nodeData, onUpdate, isFieldNode, field, mappingTree.namespaceMap, updateDocument],
  );

  const handleTypeOverrideSave = useCallback(
    (selectedType: IFieldTypeInfo) => {
      if (!isFieldNode || !field) return;

      const document = field.ownerDocument;
      const namespaceMap = mappingTree.namespaceMap;

      // Get the document reference ID before applying the override
      const previousRefId = document.getReferenceId(namespaceMap);

      // Apply the type override to the document
      FieldTypeOverrideService.applyFieldTypeOverride(
        document,
        field,
        selectedType,
        namespaceMap,
        TypeOverrideVariant.SAFE,
      );

      // Persist the changes via the provider
      updateDocument(document, document.definition, previousRefId);

      setIsTypeOverrideModalOpen(false);
      onUpdate();
    },
    [isFieldNode, field, mappingTree.namespaceMap, updateDocument, onUpdate],
  );

  const handleTypeOverrideRemove = useCallback(() => {
    if (!isFieldNode || !field) return;

    const document = field.ownerDocument;
    const namespaceMap = mappingTree.namespaceMap;

    // Get the document reference ID before reverting the override
    const previousRefId = document.getReferenceId(namespaceMap);

    // Revert the type override
    FieldTypeOverrideService.revertFieldTypeOverride(document, field, namespaceMap);

    // Persist the changes via the provider
    updateDocument(document, document.definition, previousRefId);

    setIsTypeOverrideModalOpen(false);
    onUpdate();
  }, [isFieldNode, field, mappingTree.namespaceMap, updateDocument, onUpdate]);

  const handleTypeOverrideClose = useCallback(() => {
    setIsTypeOverrideModalOpen(false);
  }, []);

  return (
    !isValueSelectorNode && (
      <ActionListItem key="transformation-actions">
        <Dropdown
          onSelect={onSelectAction}
          toggle={(toggleRef: Ref<MenuToggleElement>) => (
            <MenuToggle
              icon={dropdownLabel ? <AddCircleOIcon /> : <EllipsisVIcon />}
              ref={toggleRef}
              onClick={onToggleActionMenu}
              variant={dropdownLabel ? 'secondary' : 'plain'}
              isExpanded={isActionMenuOpen}
              aria-label="Transformation Action list"
              data-testid="transformation-actions-menu-toggle"
            >
              {dropdownLabel}
            </MenuToggle>
          )}
          isOpen={isActionMenuOpen}
          onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
          popperProps={DEFAULT_POPPER_PROPS}
          zIndex={100}
        >
          <DropdownList>
            {isFieldNode && (
              <>
                <DropdownItem
                  key="type-override"
                  value="type-override"
                  data-testid="transformation-actions-type-override"
                  icon={
                    <Icon size="sm" status="warning" isInline>
                      <WrenchIcon />
                    </Icon>
                  }
                >
                  Override field type
                </DropdownItem>
                {hasTypeOverride && (
                  <DropdownItem
                    key="reset-override"
                    value="reset-override"
                    data-testid="transformation-actions-reset-override"
                  >
                    Reset override
                  </DropdownItem>
                )}
              </>
            )}
            {allowValueSelector && (
              <DropdownItem
                key="selector"
                value="selector"
                isDisabled={hasValueSelector}
                data-testid="transformation-actions-selector"
              >
                Add selector expression
              </DropdownItem>
            )}
            {isChooseNode ? (
              <>
                <DropdownItem key="when" value="when" data-testid="transformation-actions-when">
                  Add <q>when</q>
                </DropdownItem>
                <DropdownItem
                  key="otherwise"
                  value="otherwise"
                  isDisabled={!!otherwiseItem}
                  data-testid="transformation-actions-otherwise"
                >
                  Add <q>otherwise</q>
                </DropdownItem>
              </>
            ) : (
              <>
                {allowForEach && (
                  <DropdownItem key="foreach" value="foreach" data-testid="transformation-actions-foreach">
                    Wrap with <q>for-each</q>
                  </DropdownItem>
                )}
                {allowIfChoose && (
                  <>
                    <DropdownItem key="if" value="if" data-testid="transformation-actions-if">
                      Wrap with <q>if</q>
                    </DropdownItem>
                    <DropdownItem key="choose" value="choose" data-testid="transformation-actions-choose">
                      Wrap with <q>choose-when-otherwise</q>
                    </DropdownItem>
                  </>
                )}
              </>
            )}
          </DropdownList>
        </Dropdown>

        {isFieldNode && field && (
          <TypeOverrideModal
            isOpen={isTypeOverrideModalOpen}
            onClose={handleTypeOverrideClose}
            onSave={handleTypeOverrideSave}
            onRemove={handleTypeOverrideRemove}
            field={field}
          />
        )}
      </ActionListItem>
    )
  );
};
