import { ActionListGroup } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, KeyboardEvent, useCallback } from 'react';
import { ExpressionInputAction } from './ExpressionInputAction';
import { DeleteItemAction } from './DeleteItemAction';
import { ConditionMenuAction } from './ConditionMenuAction';
import { ExpressionEditorAction } from './ExpressionEditorAction';
import { ExpressionItem } from '../../../models/mapping';
import { MappingNodeData, NodeData } from '../../../models/visualization';

type TargetNodeActionsProps = {
  nodeData: NodeData;
  onUpdate: () => void;
};

export const TargetNodeActions: FunctionComponent<TargetNodeActionsProps> = ({ nodeData, onUpdate }) => {
  const expressionItem =
    'mapping' in nodeData && nodeData.mapping && 'expression' in nodeData.mapping
      ? (nodeData.mapping as ExpressionItem)
      : undefined;
  const isDeletable = nodeData instanceof MappingNodeData;
  const handleStopPropagation = useCallback((event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <ActionListGroup
      key={`target-node-actions-${nodeData.id}`}
      onClick={handleStopPropagation}
      onKeyDown={handleStopPropagation}
    >
      {expressionItem && (
        <>
          <ExpressionInputAction mapping={expressionItem} onUpdate={onUpdate} />
          <ExpressionEditorAction nodeData={nodeData} mapping={expressionItem} onUpdate={onUpdate} />
        </>
      )}
      <ConditionMenuAction nodeData={nodeData} onUpdate={onUpdate} />
      {isDeletable && <DeleteItemAction nodeData={nodeData} onDelete={onUpdate} />}
    </ActionListGroup>
  );
};
