import './TargetNodeActions.scss';

import { ActionListGroup } from '@patternfly/react-core';
import { FunctionComponent, KeyboardEvent, MouseEvent, useCallback } from 'react';

import { TargetNodeData } from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization.service';
import { ConditionMenuAction } from './ConditionMenuAction';
import { DeleteMappingItemAction } from './DeleteMappingItemAction';
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
  const handleStopPropagation = useCallback((event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <ActionListGroup key={`target-node-actions-${nodeData.id}`} onKeyDown={handleStopPropagation} className={className}>
      {expressionItem && (
        <>
          <XPathInputAction mapping={expressionItem} onUpdate={onUpdate} />
          <XPathEditorAction nodeData={nodeData} mapping={expressionItem} onUpdate={onUpdate} />
        </>
      )}
      {allowConditionMenu && <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdate} />}
      {isDeletable && <DeleteMappingItemAction nodeData={nodeData} onDelete={onUpdate} />}
    </ActionListGroup>
  );
};
