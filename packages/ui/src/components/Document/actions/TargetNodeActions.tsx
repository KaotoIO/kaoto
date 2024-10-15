import { ActionListGroup } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, KeyboardEvent, useCallback } from 'react';
import { XPathInputAction } from './XPathInputAction';
import { DeleteMappingItemAction } from './DeleteMappingItemAction';
import { ConditionMenuAction } from './ConditionMenuAction';
import { XPathEditorAction } from './XPathEditorAction';
import { TargetNodeData } from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization.service';
import '../Document.scss';

type TargetNodeActionsProps = {
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

export const TargetNodeActions: FunctionComponent<TargetNodeActionsProps> = ({ nodeData, onUpdate }) => {
  const expressionItem = VisualizationService.getExpressionItemForNode(nodeData);
  const isDeletable = VisualizationService.isDeletableNode(nodeData);
  const handleStopPropagation = useCallback((event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <ActionListGroup key={`target-node-actions-${nodeData.id}`} onKeyDown={handleStopPropagation}>
      {expressionItem && (
        <>
          <XPathInputAction mapping={expressionItem} onUpdate={onUpdate} />
          <XPathEditorAction nodeData={nodeData} mapping={expressionItem} onUpdate={onUpdate} />
        </>
      )}
      <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdate} />
      {isDeletable && <DeleteMappingItemAction nodeData={nodeData} onDelete={onUpdate} />}
    </ActionListGroup>
  );
};
