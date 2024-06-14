import { ActionList } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { NodeData } from '../../../models/visualization';
import { useDataMapper } from '../../../hooks';
import { ChooseItem, ExpressionItem } from '../../../models/mapping';
import { DeleteItemAction } from './actions/DeleteItemAction';
import { ExpressionEditorAction } from './actions/ExpressionEditorAction';
import { ExpressionInputAction } from './actions/ExpressionInputAction';
import { ConditionMenuAction } from './actions/ConditionMenuAction';
import { ChooseMenuAction } from './actions/ChooseMenuAction';

type TargetFieldActionsProps = {
  nodeData: NodeData;
};

export const TargetFieldActions: FunctionComponent<TargetFieldActionsProps> = ({ nodeData }) => {
  const { refreshMappingTree } = useDataMapper();
  const mapping = 'mapping' in nodeData ? (nodeData.mapping! as ExpressionItem) : undefined;
  const isChooseNode = 'mapping' in nodeData && nodeData.mapping instanceof ChooseItem;

  const handleUpdate = useCallback(() => {
    refreshMappingTree();
  }, [refreshMappingTree]);

  return (
    <ActionList>
      {mapping && (
        <>
          <ExpressionInputAction mapping={mapping} onUpdate={handleUpdate} />
          <ExpressionEditorAction nodeData={nodeData} mapping={mapping} onUpdate={handleUpdate} />
        </>
      )}
      {isChooseNode ? (
        <ChooseMenuAction chooseItem={nodeData.mapping as ChooseItem} onUpdate={handleUpdate} />
      ) : (
        <ConditionMenuAction nodeData={nodeData} onUpdate={handleUpdate} />
      )}
      {mapping && <DeleteItemAction nodeData={nodeData} onDelete={handleUpdate} />}
    </ActionList>
  );
};
