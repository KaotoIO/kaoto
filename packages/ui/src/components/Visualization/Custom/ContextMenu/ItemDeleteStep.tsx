import { TrashIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ActionConfirmationModalContext } from '../../../../providers/action-confirmation-modal.provider';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { IInteractionAddonType } from '../../../registers/interactions/node-interaction-addon.model';
import { processNodeInteractionAddonRecursively } from './item-delete-helper';

interface ItemDeleteStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  loadActionConfirmationModal: boolean;
}

export const ItemDeleteStep: FunctionComponent<ItemDeleteStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onRemoveNode = useCallback(async () => {
    if (props.loadActionConfirmationModal) {
      /** Open delete confirm modal, get the confirmation  */
      const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
        title: 'Permanently delete step?',
        text: 'Step and its children will be lost.',
      });

      if (!isDeleteConfirmed) return;
    }

    processNodeInteractionAddonRecursively(props.vizNode, (vn) =>
      getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vn),
    );

    props.vizNode?.removeChild();
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [
    deleteModalContext,
    entitiesContext,
    getRegisteredInteractionAddons,
    props.loadActionConfirmationModal,
    props.vizNode,
  ]);

  return (
    <ContextMenuItem onClick={onRemoveNode} data-testid={props['data-testid']}>
      <TrashIcon /> Delete
    </ContextMenuItem>
  );
};
