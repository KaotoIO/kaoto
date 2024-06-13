import { ActionList } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { DocumentNodeData } from '../../../models/visualization';
import { useDataMapper } from '../../../hooks';
import { ValueSelector } from '../../../models/mapping';
import { DeleteItemAction } from './actions/DeleteItemAction';
import { ExpressionEditorAction } from './actions/ExpressionEditorAction';
import { ExpressionInputAction } from './actions/ExpressionInputAction';
import { ConditionMenuAction } from './actions/ConditionMenuAction';

type TargetPrimitiveDocumentActionsProps = {
  nodeData: DocumentNodeData;
};

export const TargetPrimitiveDocumentActions: FunctionComponent<TargetPrimitiveDocumentActionsProps> = ({
  nodeData,
}) => {
  const { refreshMappingTree } = useDataMapper();
  const mapping = nodeData.mappingTree?.children.find((m) => m instanceof ValueSelector) as ValueSelector;

  return (
    <ActionList>
      {mapping && (
        <>
          <ExpressionInputAction mapping={mapping} onUpdate={refreshMappingTree} />
          <ExpressionEditorAction nodeData={nodeData} mapping={mapping} onUpdate={refreshMappingTree} />
        </>
      )}
      <ConditionMenuAction nodeData={nodeData} onUpdate={refreshMappingTree} />
      {mapping && <DeleteItemAction nodeData={nodeData} onDelete={refreshMappingTree} />}
    </ActionList>
  );
};
