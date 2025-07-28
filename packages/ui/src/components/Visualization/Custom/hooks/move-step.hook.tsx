import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { isDefined } from '@kaoto/forms';

export const useMoveStep = (vizNode: IVisualizationNode, mode: AddStepMode.AppendStep | AddStepMode.PrependStep) => {
  const entitiesContext = useContext(EntitiesContext);
  let canBeMoved = true;

  if (mode === AddStepMode.AppendStep) {
    canBeMoved = isDefined(vizNode.getNextNodeToMove());
  } else {
    canBeMoved = isDefined(vizNode.getPreviousNodeToMove());
  }

  const onMoveStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    const currentNodeContent = vizNode.getCopiedContent();
    const targetNode = mode === AddStepMode.AppendStep ? vizNode.getNextNodeToMove() : vizNode.getPreviousNodeToMove();

    const targetNodeContent = targetNode?.getCopiedContent();

    if (!currentNodeContent || !targetNodeContent) return;

    /** Replace the content of the target node with the current node content
        and vice versa  */
    vizNode.pasteBaseEntityStep(targetNodeContent, AddStepMode.ReplaceStep);
    targetNode?.pasteBaseEntityStep(currentNodeContent, AddStepMode.ReplaceStep);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [entitiesContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onMoveStep,
      canBeMoved,
    }),
    [canBeMoved, onMoveStep],
  );

  return value;
};
