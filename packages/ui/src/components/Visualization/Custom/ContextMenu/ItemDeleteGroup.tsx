import { TrashIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import {
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';
import { IVisualizationNode, IVisualizationNodeData } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { EntitiesContextResult } from '../../../../hooks';

interface ItemDeleteGroupProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

export const deleteRoute = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteModalContext: any,
  entitiesContext: EntitiesContextResult | null,
  vizNode: IVisualizationNode<IVisualizationNodeData>,
) => {
  /** Open delete confirm modal, get the confirmation  */
  const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
    title: 'Permanently delete flow?',
    text: 'All steps will be lost.',
  });

  if (isDeleteConfirmed !== ACTION_ID_CONFIRM) return;
  const flowId = vizNode?.getId();

  entitiesContext?.camelResource.removeEntity(flowId);

  entitiesContext?.updateEntitiesFromCamelResource();
};

export const ItemDeleteGroup: FunctionComponent<ItemDeleteGroupProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);

  const onRemoveGroup = useCallback(async () => {
    deleteRoute(deleteModalContext, entitiesContext, props.vizNode);
  }, [deleteModalContext, entitiesContext, props.vizNode]);

  return (
    <ContextMenuItem onClick={onRemoveGroup} data-testid={props['data-testid']}>
      <TrashIcon /> Delete
    </ContextMenuItem>
  );
};
