import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';

export const useMoveStep = (vizNode: IVisualizationNode, mode: AddStepMode.AppendStep | AddStepMode.PrependStep) => {
  const entitiesContext = useContext(EntitiesContext);

  const onMoveStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    const currentNodeContent = vizNode.getCopiedContent();
    const targetNode = mode === AddStepMode.AppendStep ? vizNode.getNextNode() : vizNode.getPreviousNode();

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
    }),
    [onMoveStep],
  );

  return value;
};
