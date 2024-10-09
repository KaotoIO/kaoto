import { TrashIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import {
  ACTION_ID_CANCEL,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { IInteractionAddonType } from '../../../registers/interactions/node-interaction-addon.model';
import { findModalCustomizationRecursively, processNodeInteractionAddonRecursively } from './item-delete-helper';

interface ItemDeleteGroupProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

export const ItemDeleteGroup: FunctionComponent<ItemDeleteGroupProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const flowId = props.vizNode?.getId();

  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onRemoveGroup = useCallback(async () => {
    const modalCustoms = findModalCustomizationRecursively(props.vizNode, (vn) =>
      getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vn),
    );
    const additionalModalText = modalCustoms.length > 0 ? modalCustoms[0].additionalText : undefined;
    const buttonOptions = modalCustoms.length > 0 ? modalCustoms[0].buttonOptions : undefined;
    /** Open delete confirm modal, get the confirmation  */
    const modalAnswer = await deleteModalContext?.actionConfirmation({
      title: 'Permanently delete flow?',
      text: 'All steps will be lost.',
      additionalModalText,
      buttonOptions,
    });

    if (!modalAnswer || modalAnswer === ACTION_ID_CANCEL) return;

    processNodeInteractionAddonRecursively(props.vizNode, modalAnswer, (vn) =>
      getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vn),
    );

    entitiesContext?.camelResource.removeEntity(flowId);
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [deleteModalContext, entitiesContext, flowId, getRegisteredInteractionAddons, props.vizNode]);

  return (
    <ContextMenuItem onClick={onRemoveGroup} data-testid={props['data-testid']}>
      <TrashIcon /> Delete
    </ContextMenuItem>
  );
};
