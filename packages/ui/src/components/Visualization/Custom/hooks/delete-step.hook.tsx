import { useCallback, useContext, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ACTION_ID_CANCEL, ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { IInteractionType } from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import {
  findOnDeleteModalCustomizationRecursively,
  processOnDeleteAddonRecursively,
} from '../ContextMenu/item-interaction-helper';

export const useDeleteStep = (vizNode: IVisualizationNode | undefined) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const childrenNodes = vizNode?.getChildren();
  const hasChildren = childrenNodes !== undefined && childrenNodes.length > 0;
  const isPlaceholderNode = hasChildren && childrenNodes.length === 1 && childrenNodes[0].data.isPlaceholder;
  const { getRegisteredInteractionAddons } = useContext(NodeInteractionAddonContext);

  const onDeleteStep = useCallback(async () => {
    if (!vizNode) return;

    const modalCustoms = findOnDeleteModalCustomizationRecursively(vizNode, (vn) =>
      getRegisteredInteractionAddons(IInteractionType.ON_DELETE, vn),
    );

    let modalAnswer: string | undefined = ACTION_ID_CONFIRM;
    if ((hasChildren && !isPlaceholderNode) || modalCustoms.length > 0) {
      const additionalModalText = modalCustoms.length > 0 ? modalCustoms[0].additionalText : undefined;
      const buttonOptions = modalCustoms.length > 0 ? modalCustoms[0].buttonOptions : undefined;
      /** Open delete confirm modal, get the confirmation  */
      modalAnswer = await deleteModalContext?.actionConfirmation({
        title: 'Permanently delete step?',
        text: 'Step and its children will be lost.',
        additionalModalText,
        buttonOptions,
      });

      if (!modalAnswer || modalAnswer === ACTION_ID_CANCEL) return;
    }

    processOnDeleteAddonRecursively(vizNode, modalAnswer, (vn) =>
      getRegisteredInteractionAddons(IInteractionType.ON_DELETE, vn),
    );

    vizNode.removeChild();
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [deleteModalContext, entitiesContext, getRegisteredInteractionAddons, hasChildren, isPlaceholderNode, vizNode]);

  const value = useMemo(
    () => ({
      onDeleteStep,
    }),
    [onDeleteStep],
  );

  return value;
};
