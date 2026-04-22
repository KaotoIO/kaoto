import './TargetNodeActions.scss';

import { ActionListGroup } from '@patternfly/react-core';
import { FunctionComponent, KeyboardEvent, MouseEvent, useCallback } from 'react';

import { MappingActionKind } from '../../../models/datamapper/mapping-action';
import { TargetNodeData } from '../../../models/datamapper/visualization';
import { MappingActionService } from '../../../services/visualization/mapping-action.service';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { DeleteMappingItemAction } from './DeleteMappingItemAction';
import { MappingContextMenuAction } from './MappingContextMenuAction';
import { XPathEditorAction } from './XPathEditorAction';
import { XPathInputAction } from './XPathInputAction';

type TargetNodeActionsProps = {
  className?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

export const TargetNodeActions: FunctionComponent<TargetNodeActionsProps> = ({ className, nodeData, onUpdate }) => {
  const expressionItem = VisualizationService.getExpressionItemForNode(nodeData);
  const allowedActions = new Set(MappingActionService.getAllowedActions(nodeData));

  const handleStopPropagation = useCallback((event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <ActionListGroup key={`target-node-actions-${nodeData.id}`} onKeyDown={handleStopPropagation} className={className}>
      {expressionItem && (
        <>
          <XPathInputAction nodeData={nodeData} mapping={expressionItem} onUpdate={onUpdate} />
          <XPathEditorAction nodeData={nodeData} mapping={expressionItem} onUpdate={onUpdate} />
        </>
      )}
      {allowedActions.has(MappingActionKind.ContextMenu) && (
        <MappingContextMenuAction nodeData={nodeData} onUpdate={onUpdate} />
      )}
      {allowedActions.has(MappingActionKind.Delete) && (
        <DeleteMappingItemAction nodeData={nodeData} onDelete={onUpdate} />
      )}
    </ActionListGroup>
  );
};
