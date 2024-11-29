import { useCallback, useContext, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useDeleteGroup = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const flowId = vizNode?.getId();

  const onDeleteGroup = useCallback(async () => {
    /** Open delete confirm modal, get the confirmation  */
    const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
      title: "Do you want to delete the '" + vizNode.getId() + "' " + vizNode.getTitle() + '?',
      text: 'All steps will be lost.',
    });

    if (isDeleteConfirmed !== ACTION_ID_CONFIRM) return;

    entitiesContext?.camelResource.removeEntity(flowId);
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [deleteModalContext, entitiesContext, flowId]);

  const value = useMemo(
    () => ({
      onDeleteGroup,
    }),
    [onDeleteGroup],
  );

  return value;
};
