import { TrashIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ActionConfirmationModalContext } from '../../../../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { IInteractionAddonType } from '../../../registers/interactions/node-interaction-addon.model';

interface ItemDeleteGroupProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

export const ItemDeleteGroup: FunctionComponent<ItemDeleteGroupProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const flowId = props.vizNode?.getId();

  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onDeleteRecursively = useCallback(
    (parentVizNode: IVisualizationNode) => {
      parentVizNode.getChildren()?.forEach((child) => {
        onDeleteRecursively(child);
      });
      const addons = getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, parentVizNode);
      addons.forEach((addon) => {
        addon.callback(parentVizNode);
      });
    },
    [getRegisteredInteractionAddons],
  );

  const onRemoveGroup = useCallback(async () => {
    /** Open delete confirm modal, get the confirmation  */
    const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
      title: 'Permanently delete flow?',
      text: 'All steps will be lost.',
    });

    if (!isDeleteConfirmed) return;

    onDeleteRecursively(props.vizNode);

    entitiesContext?.camelResource.removeEntity(flowId);
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [deleteModalContext, entitiesContext, flowId, onDeleteRecursively, props.vizNode]);

  return (
    <ContextMenuItem onClick={onRemoveGroup} data-testid={props['data-testid']}>
      <TrashIcon /> Delete
    </ContextMenuItem>
  );
};
