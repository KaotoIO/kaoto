import './TargetNodeActions.scss';

import { ActionListGroup, ActionListItem, Button, Icon } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, KeyboardEvent, MouseEvent, useCallback, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { IFieldTypeInfo, TypeOverrideVariant } from '../../../models/datamapper/types';
import { FieldItemNodeData, TargetFieldNodeData, TargetNodeData } from '../../../models/datamapper/visualization';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { VisualizationService } from '../../../services/visualization.service';
import { ConditionMenuAction } from './ConditionMenuAction';
import { DeleteMappingItemAction } from './DeleteMappingItemAction';
import { TypeOverrideModal } from './TypeOverrideModal';
import { XPathEditorAction } from './XPathEditorAction';
import { XPathInputAction } from './XPathInputAction';

type TargetNodeActionsProps = {
  className?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

export const TargetNodeActions: FunctionComponent<TargetNodeActionsProps> = ({ className, nodeData, onUpdate }) => {
  const expressionItem = VisualizationService.getExpressionItemForNode(nodeData);
  const allowConditionMenu = VisualizationService.allowConditionMenu(nodeData);
  const isDeletable = VisualizationService.isDeletableNode(nodeData);
  const { mappingTree, updateDocument } = useDataMapper();
  const [isTypeOverrideModalOpen, setIsTypeOverrideModalOpen] = useState(false);

  const handleStopPropagation = useCallback((event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  // Check if node has type override
  const isFieldNode = nodeData instanceof TargetFieldNodeData || nodeData instanceof FieldItemNodeData;
  const field = isFieldNode ? nodeData.field : undefined;
  const hasTypeOverride = field && field.typeOverride !== TypeOverrideVariant.NONE;
  const originalType = hasTypeOverride ? field?.originalType : undefined;

  const handleOpenTypeOverrideModal = useCallback(() => {
    setIsTypeOverrideModalOpen(true);
  }, []);

  const handleCloseTypeOverrideModal = useCallback(() => {
    setIsTypeOverrideModalOpen(false);
  }, []);

  const handleTypeOverrideSave = useCallback(
    (selectedType: IFieldTypeInfo) => {
      if (field) {
        const document = field.ownerDocument;
        const namespaceMap = mappingTree.namespaceMap;
        const previousRefId = document.getReferenceId(namespaceMap);
        FieldTypeOverrideService.applyFieldTypeOverride(
          document,
          field,
          selectedType,
          namespaceMap,
          TypeOverrideVariant.SAFE,
        );
        updateDocument(document, document.definition, previousRefId);
        onUpdate();
        setIsTypeOverrideModalOpen(false);
      }
    },
    [field, mappingTree.namespaceMap, updateDocument, onUpdate],
  );

  const handleTypeOverrideRemove = useCallback(() => {
    if (field) {
      const document = field.ownerDocument;
      const namespaceMap = mappingTree.namespaceMap;
      const previousRefId = document.getReferenceId(namespaceMap);
      FieldTypeOverrideService.revertFieldTypeOverride(document, field, namespaceMap);
      updateDocument(document, document.definition, previousRefId);
      onUpdate();
      setIsTypeOverrideModalOpen(false);
    }
  }, [field, mappingTree.namespaceMap, updateDocument, onUpdate]);

  return (
    <ActionListGroup key={`target-node-actions-${nodeData.id}`} onKeyDown={handleStopPropagation} className={className}>
      {expressionItem && (
        <>
          <XPathInputAction mapping={expressionItem} onUpdate={onUpdate} />
          {hasTypeOverride && (
            <ActionListItem key="type-override-indicator">
              <Button
                variant="plain"
                title={`Type overridden: ${originalType} → ${field?.type}. Click to edit.`}
                aria-label="Edit type override"
                className="document-field__button"
                onClick={handleOpenTypeOverrideModal}
                icon={
                  <Icon size="sm" status="warning" isInline>
                    <WrenchIcon />
                  </Icon>
                }
              />
            </ActionListItem>
          )}
          <XPathEditorAction nodeData={nodeData} mapping={expressionItem} onUpdate={onUpdate} />
        </>
      )}
      {allowConditionMenu && <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdate} />}
      {isDeletable && <DeleteMappingItemAction nodeData={nodeData} onDelete={onUpdate} />}
      {isFieldNode && field && (
        <TypeOverrideModal
          isOpen={isTypeOverrideModalOpen}
          onClose={handleCloseTypeOverrideModal}
          onSave={handleTypeOverrideSave}
          onRemove={handleTypeOverrideRemove}
          field={field}
        />
      )}
    </ActionListGroup>
  );
};
