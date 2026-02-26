import './TargetNodeActions.scss';

import { ActionListGroup, ActionListItem, Button, Icon } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, KeyboardEvent, MouseEvent, useCallback, useState } from 'react';

import { TypeOverrideVariant } from '../../../models/datamapper/types';
import { TargetNodeData } from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization.service';
import { ConditionMenuAction } from './ConditionMenuAction';
import { DeleteMappingItemAction } from './DeleteMappingItemAction';
import { FieldTypeOverride } from './FieldTypeOverride';
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
  const [isTypeOverrideModalOpen, setIsTypeOverrideModalOpen] = useState(false);

  const handleStopPropagation = useCallback((event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  const field = VisualizationService.getField(nodeData);
  const hasTypeOverride = field && field.typeOverride !== TypeOverrideVariant.NONE;

  return (
    <ActionListGroup key={`target-node-actions-${nodeData.id}`} onKeyDown={handleStopPropagation} className={className}>
      {expressionItem && (
        <>
          <XPathInputAction mapping={expressionItem} onUpdate={onUpdate} />
          {hasTypeOverride && (
            <ActionListItem key="type-override-indicator">
              <Button
                variant="plain"
                title={`Type overridden: ${field?.originalType} → ${field?.type}. Click to edit.`}
                aria-label="Edit type override"
                className="document-field__button"
                onClick={() => setIsTypeOverrideModalOpen(true)}
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
      {field && (
        <FieldTypeOverride
          isOpen={isTypeOverrideModalOpen}
          field={field}
          onComplete={onUpdate}
          onClose={() => setIsTypeOverrideModalOpen(false)}
        />
      )}
    </ActionListGroup>
  );
};
