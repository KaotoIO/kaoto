import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { isDefined } from '@kaoto/forms';
import { useVisualizationController } from '@patternfly/react-topology';
import { getVisualizationNodesFromGraph } from '../../../../utils/get-viznodes-from-graph';
import { getPotentialPath } from '../../../../utils/get-potential-path';

export const useMoveStep = (vizNode: IVisualizationNode, mode: AddStepMode.AppendStep | AddStepMode.PrependStep) => {
  const entitiesContext = useContext(EntitiesContext);
  const controller = useVisualizationController();

  const targetNode = useMemo(() => {
    const nodePath = vizNode.data.path;
    const targetPath =
      mode === AddStepMode.AppendStep ? getPotentialPath(nodePath, 'forward') : getPotentialPath(nodePath, 'backward');

    if (!isDefined(targetPath)) return undefined;

    const nodes = getVisualizationNodesFromGraph(
      controller.getGraph(),
      (node: IVisualizationNode) => (node.data.path ?? '').startsWith(targetPath) && node.getId() === vizNode.getId(),
    );

    if (nodes.length > 1) {
      return nodes.reduce(
        (shortest, current) =>
          (current.data.path ?? '').length < (shortest.data.path ?? '').length ? current : shortest,
        nodes[0],
      );
    }

    return nodes.length === 1 ? nodes[0] : undefined;
  }, [vizNode, controller, mode]);

  const canBeMoved = isDefined(targetNode);

  const onMoveStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    const currentNodeContent = vizNode.getCopiedContent();
    const targetNodeContent = targetNode?.getCopiedContent();

    if (!currentNodeContent || !targetNodeContent) return;

    /** Replace the content of the target node with the current node content
        and vice versa  */
    vizNode.pasteBaseEntityStep(targetNodeContent, AddStepMode.ReplaceStep);
    targetNode?.pasteBaseEntityStep(currentNodeContent, AddStepMode.ReplaceStep);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [entitiesContext, targetNode, vizNode]);

  const value = useMemo(
    () => ({
      onMoveStep,
      canBeMoved,
    }),
    [canBeMoved, onMoveStep],
  );

  return value;
};
