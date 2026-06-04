import { useCallback, useContext, useMemo } from 'react';

import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ACTION_ID_CANCEL, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { IInteractionType, IOnDeleteAddon } from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import {
  findOnDeleteModalCustomizationRecursively,
  processOnDeleteAddonRecursively,
} from '../ContextMenu/item-interaction-helper';

export const useDeleteGroup = (vizNode: IVisualizationNode | undefined) => {
  const { isLoading, camelResource, updateEntitiesFromCamelResource } = useContext(EntitiesContext)!;
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const flowId = vizNode?.getId();

  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onDeleteGroup = useCallback(async () => {
    if (isLoading || !camelResource || !vizNode) return;
    const modalCustoms = findOnDeleteModalCustomizationRecursively(
      vizNode,
      (vn) => getRegisteredInteractionAddons(IInteractionType.ON_DELETE, vn) as IOnDeleteAddon[],
    );
    const additionalModalText = modalCustoms.length > 0 ? modalCustoms[0].additionalText : undefined;
    const buttonOptions = modalCustoms.length > 0 ? modalCustoms[0].buttonOptions : undefined;
    /** Open delete confirm modal, get the confirmation  */
    const modalAnswer = await deleteModalContext?.actionConfirmation({
      title: "Do you want to delete the '" + vizNode.getId() + "' " + vizNode.getNodeTitle() + '?',
      text: 'All steps will be lost.',
      additionalModalText,
      buttonOptions,
    });

    if (!modalAnswer || modalAnswer === ACTION_ID_CANCEL) return;

    processOnDeleteAddonRecursively(
      vizNode,
      modalAnswer,
      (vn) => getRegisteredInteractionAddons(IInteractionType.ON_DELETE, vn) as IOnDeleteAddon[],
    );

    camelResource?.removeEntity(flowId ? [flowId] : undefined);
    updateEntitiesFromCamelResource();
  }, [
    isLoading,
    vizNode,
    deleteModalContext,
    camelResource,
    flowId,
    updateEntitiesFromCamelResource,
    getRegisteredInteractionAddons,
  ]);

  const value = useMemo(
    () => ({
      onDeleteGroup,
    }),
    [onDeleteGroup],
  );

  return value;
};
