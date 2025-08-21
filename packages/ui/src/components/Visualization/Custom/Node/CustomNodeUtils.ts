import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { isDefined } from '../../../../utils/is-defined';

export const getNodeDragAndDropDirection = (
  draggedVizNode: IVisualizationNode,
  droppedVizNode: IVisualizationNode,
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

  return 'forward';
};

export const handleValidNodeDrop = (
  draggedVizNode: IVisualizationNode,
  droppedVizNode: IVisualizationNode,
  removeFlow: (flowId?: string) => void,
) => {
  const draggedNodeContent = draggedVizNode.getCopiedContent();
  if (!isDefined(draggedNodeContent)) return;

  /** Handle the drag and drop operation based on the direction differently:
        for forward direction we append the step to the dropped node, then remove the dragged node
        for backward direction we remove the dragged node first, then prepend the step to the dropped node
    */
  switch (getNodeDragAndDropDirection(draggedVizNode, droppedVizNode)) {
    case 'forward': {
      droppedVizNode.pasteBaseEntityStep(draggedNodeContent, AddStepMode.AppendStep);
      const draggedVizNodeinteraction = draggedVizNode.getNodeInteraction();
      if (draggedVizNodeinteraction.canRemoveStep) {
        draggedVizNode.removeChild();
      } else if (draggedVizNodeinteraction.canRemoveFlow) {
        const flowId = draggedVizNode?.getId();
        removeFlow(flowId);
      }
      break;
    }
    case 'backward':
      draggedVizNode.removeChild();
      droppedVizNode.pasteBaseEntityStep(draggedNodeContent, AddStepMode.PrependStep);
      break;
  }
};

export const checkNodeDropCompatibility = (
  draggedVizNode: IVisualizationNode,
  droppedVizNode: IVisualizationNode,
  validate: (mode: AddStepMode, filterNode: IVisualizationNode, compatibilityCheckNodeName: string) => boolean,
): boolean => {
  const actionDirection = getNodeDragAndDropDirection(draggedVizNode, droppedVizNode);
  const droppedVizNodeContent = draggedVizNode.getCopiedContent();
  const targetVizNodeContent = droppedVizNode.getCopiedContent();
  if (!isDefined(droppedVizNodeContent) || !isDefined(targetVizNodeContent)) return false;

  // Validation for step array nodes
  if (
    actionDirection === 'forward'
      ? droppedVizNode.getNodeInteraction().canHaveNextStep
      : droppedVizNode.getNodeInteraction().canHavePreviousStep
  ) {
    return validate(
      actionDirection === 'forward' ? AddStepMode.AppendStep : AddStepMode.PrependStep,
      droppedVizNode,
      droppedVizNodeContent.name,
    );
  }

  // validation for special children nodes in case of Route Entity
  if (droppedVizNodeContent.name !== targetVizNodeContent.name) return false;
  const targetVizNodeParent = droppedVizNode.getParentNode();
  if (targetVizNodeParent?.getNodeInteraction().canHaveSpecialChildren) {
    return validate(AddStepMode.InsertSpecialChildStep, targetVizNodeParent, droppedVizNodeContent.name);
  }

  return false;
};
