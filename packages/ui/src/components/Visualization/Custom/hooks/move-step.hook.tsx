import { isDefined } from '@kaoto/forms';
import { useVisualizationController } from '@patternfly/react-topology';
import { useCallback, useContext, useMemo } from 'react';

import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { getPotentialPath } from '../../../../utils/get-potential-path';
import { getVisualizationNodesFromGraph } from '../../../../utils/get-viznodes-from-graph';
import { IInteractionType, IOnCopyAddon } from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { processOnCopyAddon } from '../ContextMenu/item-interaction-helper';

export const useMoveStep = (vizNode: IVisualizationNode, mode: AddStepMode.AppendStep | AddStepMode.PrependStep) => {
  const entitiesContext = useContext(EntitiesContext);
  const controller = useVisualizationController();
  const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);

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

    return nodes.length === 1 && !nodes[0].data.isPlaceholder ? nodes[0] : undefined;
  }, [vizNode, controller, mode]);

  const canBeMoved = isDefined(targetNode);

  const onMoveStep = useCallback(async () => {
    if (!vizNode || !entitiesContext || !targetNode) return;

    let currentNodeContent = vizNode.getCopiedContent();
    currentNodeContent = processOnCopyAddon(
      vizNode,
      currentNodeContent,
      (vizNode) =>
        nodeInteractionAddonContext.getRegisteredInteractionAddons(IInteractionType.ON_COPY, vizNode) as IOnCopyAddon[],
    );
    let targetNodeContent = targetNode.getCopiedContent();
    targetNodeContent = processOnCopyAddon(
      targetNode,
      targetNodeContent,
      (vizNode) =>
        nodeInteractionAddonContext.getRegisteredInteractionAddons(IInteractionType.ON_COPY, vizNode) as IOnCopyAddon[],
    );

    if (!currentNodeContent || !targetNodeContent) return;

    /** Replace the content of the target node with the current node content
        and vice versa  */
    vizNode.pasteBaseEntityStep(targetNodeContent, AddStepMode.ReplaceStep);
    targetNode?.pasteBaseEntityStep(currentNodeContent, AddStepMode.ReplaceStep);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
