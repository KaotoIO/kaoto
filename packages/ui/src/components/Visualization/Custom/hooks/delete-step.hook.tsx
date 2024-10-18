import { useCallback, useContext, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useDeleteStep = (vizNode: IVisualizationNode) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);
  const childrenNodes = vizNode.getChildren();
  const hasChildren = childrenNodes !== undefined && childrenNodes.length > 0;

  const onDeleteStep = useCallback(async () => {
    if (hasChildren) {
      /** Open delete confirm modal, get the confirmation  */
      const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
        title: 'Permanently delete step?',
        text: 'Step and its children will be lost.',
      });

      if (isDeleteConfirmed !== ACTION_ID_CONFIRM) return;
    }

    vizNode.removeChild();
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [deleteModalContext, entitiesContext, hasChildren, vizNode]);

  const value = useMemo(
    () => ({
      onDeleteStep,
    }),
    [onDeleteStep],
  );

  return value;
};
