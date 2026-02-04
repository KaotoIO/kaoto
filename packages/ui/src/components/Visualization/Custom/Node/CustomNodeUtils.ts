import { isDefined } from '@kaoto/forms';
import { ElementModel, GraphElement, Node } from '@patternfly/react-topology';

import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContextResult } from '../../../../providers/entities.provider';
import {
  IInteractionType,
  INodeInteractionAddonContext,
  IOnCopyAddon,
} from '../../../registers/interactions/node-interaction-addon.model';
import { CanvasNode } from '../../Canvas/canvas.models';
import { processOnCopyAddon } from '../ContextMenu/item-interaction-helper';
import { NoBendpointsEdge } from '../NoBendingEdge';

export const getNodeDragAndDropDirection = (
  draggedVizNode: IVisualizationNode,
  droppedVizNode: IVisualizationNode,
  droppedIntoEdge: boolean,
): 'forward' | 'backward' => {
  const isSameBaseEntity = draggedVizNode?.getId() === droppedVizNode?.getId();
  if (!isSameBaseEntity) return 'forward';

  const draggedNodeArray = (draggedVizNode.data.path ?? '').split('.');
  const droppedNodeArray = (droppedVizNode.data.path ?? '').split('.');
  for (let i = 0; i < Math.min(draggedNodeArray.length, droppedNodeArray.length); i++) {
    if (draggedNodeArray[i] !== droppedNodeArray[i]) {
      if (Number.isInteger(Number(draggedNodeArray[i])) && Number.isInteger(Number(droppedNodeArray[i]))) {
        return draggedNodeArray[i] < droppedNodeArray[i] ? 'forward' : 'backward';
      }
      break;
    }
  }

  // Special case: when a container sub-node is dragged backward and dropped on the container connected edge
  if (droppedIntoEdge) {
    return 'backward';
  }

  return 'forward';
};

export const handleValidNodeDrop = (
  draggedElement: GraphElement<ElementModel, CanvasNode['data']>,
  dropResult: GraphElement<ElementModel, unknown>,
  entitiesContext: EntitiesContextResult,
  nodeInteractionAddonContext: INodeInteractionAddonContext,
) => {
  const draggedVizNode = draggedElement.getData()?.vizNode;
  if (!isDefined(draggedVizNode)) return;

  let droppedVizNode: IVisualizationNode;
  let droppedIntoEdge = false;

  if (dropResult instanceof NoBendpointsEdge) {
    droppedVizNode = dropResult.getTarget().getData().vizNode;
    droppedIntoEdge = true;
  } else {
    droppedVizNode = (dropResult as Node).getData().vizNode;
  }

  let draggedNodeContent = draggedVizNode?.getCopiedContent();
  if (!isDefined(draggedNodeContent)) return;

  draggedNodeContent = processOnCopyAddon(
    draggedVizNode,
    draggedNodeContent,
    (vn) => nodeInteractionAddonContext.getRegisteredInteractionAddons(IInteractionType.ON_COPY, vn) as IOnCopyAddon[],
  );

  if (!isDefined(draggedNodeContent)) return;

  /** Handle the drag and drop operation based on the direction differently:
        for forward direction we append the step to the dropped node, then remove the dragged node
        for backward direction we remove the dragged node first, then prepend the step to the dropped node
    */
  switch (getNodeDragAndDropDirection(draggedVizNode, droppedVizNode, droppedIntoEdge)) {
    case 'forward': {
      droppedVizNode.pasteBaseEntityStep(
        draggedNodeContent,
        droppedIntoEdge ? AddStepMode.PrependStep : AddStepMode.AppendStep,
      );
      const draggedVizNodeinteraction = draggedVizNode.getNodeInteraction();
      if (draggedVizNodeinteraction.canRemoveStep) {
        draggedVizNode.removeChild();
      } else if (draggedVizNodeinteraction.canRemoveFlow) {
        const flowId = draggedVizNode?.getId();
        entitiesContext.camelResource.removeEntity(flowId ? [flowId] : undefined);
      }
      break;
    }
    case 'backward':
      draggedVizNode.removeChild();
      droppedVizNode.pasteBaseEntityStep(draggedNodeContent, AddStepMode.PrependStep);
      break;
  }

  // Set an empty model to clear the graph
  draggedElement.getController().fromModel({
    nodes: [],
    edges: [],
  });
  requestAnimationFrame(() => {
    entitiesContext.updateEntitiesFromCamelResource();
  });
};

export const checkNodeDropCompatibility = (
  draggedVizNode: IVisualizationNode,
  droppedVizNode: IVisualizationNode,
  validate: (mode: AddStepMode, filterNode: IVisualizationNode, compatibilityCheckNodeName: string) => boolean,
): boolean => {
  const droppedVizNodeContent = draggedVizNode.getCopiedContent();
  const targetVizNodeContent = droppedVizNode.getCopiedContent();
  if (!isDefined(droppedVizNodeContent) || !isDefined(targetVizNodeContent)) return false;

  if (droppedVizNode.data.isPlaceholder && droppedVizNode.getPreviousNode() !== draggedVizNode) {
    return validate(AddStepMode.ReplaceStep, droppedVizNode, droppedVizNodeContent.name);
  }

  // validation for special children nodes in case of Route Entity
  if (droppedVizNodeContent.name !== targetVizNodeContent.name) return false;
  const targetVizNodeParent = droppedVizNode.getParentNode();
  if (targetVizNodeParent?.getNodeInteraction().canHaveSpecialChildren) {
    return validate(AddStepMode.InsertSpecialChildStep, targetVizNodeParent, droppedVizNodeContent.name);
  }

  return false;
};
