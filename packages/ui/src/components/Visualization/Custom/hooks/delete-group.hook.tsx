import { useCallback, useContext, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ACTION_ID_CANCEL, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { IInteractionAddonType } from '../../../registers/interactions/node-interaction-addon.model';
import {
  findModalCustomizationRecursively,
  processNodeInteractionAddonRecursively,
} from '../ContextMenu/item-delete-helper';

export const useDeleteGroup = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const flowId = vizNode?.getId();

  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onDeleteGroup = useCallback(async () => {
    const modalCustoms = findModalCustomizationRecursively(vizNode, (vn) =>
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

    processNodeInteractionAddonRecursively(vizNode, modalAnswer, (vn) =>
      getRegisteredInteractionAddons(IInteractionAddonType.ON_DELETE, vn),
    );

    entitiesContext?.camelResource.removeEntity(flowId);
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [deleteModalContext, entitiesContext, flowId, getRegisteredInteractionAddons, vizNode]);

  const value = useMemo(
    () => ({
      onDeleteGroup,
    }),
    [onDeleteGroup],
  );

  return value;
};
