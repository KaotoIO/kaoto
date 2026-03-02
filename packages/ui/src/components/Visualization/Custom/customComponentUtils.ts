import { Edge, EdgeModel } from '@patternfly/react-topology';

import { CatalogModalContextValue } from '../../../dynamic-catalog/catalog-modal.provider';
import { AddStepMode, IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { EntitiesContextResult } from '../../../providers';

const NODE_DRAG_TYPE = '#node#';
const GROUP_DRAG_TYPE = '#group#';

const canDropOnEdge = (
  draggedVizNode: IVisualizationNode,
  potentialEdge: Edge<EdgeModel, unknown>,
  camelResource: EntitiesContextResult['camelResource'],
  catalogModalContext: CatalogModalContextValue,
) => {
  const followingVizNode = potentialEdge.getTarget().getData().vizNode;
  const precedingVizNode = potentialEdge.getSource().getData().vizNode;

  if (
    draggedVizNode.getNextNode() === followingVizNode ||
    draggedVizNode.getPreviousNode() === precedingVizNode ||
    followingVizNode?.data.isPlaceholder
  )
    return false;

  /*
   if both following and preceding nodes path has the dragged node path,
   it means we're dragging the node on its own edge, so we should not allow it 
  */
  const draggedNodePath = draggedVizNode.data.path;
  const followingNodePath = followingVizNode.data.path;
  const precedingNodePath = precedingVizNode.data.path;
  if (
    followingNodePath?.includes(draggedNodePath) &&
    precedingNodePath?.includes(draggedNodePath) &&
    followingVizNode.getId() === draggedVizNode.getId()
  ) {
    return false;
  }

  const filter = camelResource.getCompatibleComponents(
    AddStepMode.PrependStep,
    followingVizNode.data,
    followingVizNode.getNodeDefinition(),
  );
  return catalogModalContext.checkCompatibility(draggedVizNode.getCopiedContent()!.name, filter) ?? false;
};

const canDragGroup = (groupVizNode?: IVisualizationNode): boolean => {
  if (groupVizNode === undefined) {
    return false;
  }

  // Do not allow dragging top-level groups like Route
  if (groupVizNode.data.path?.split('.').length === 1) {
    return false;
  }

  return true;
};

export { canDragGroup, canDropOnEdge, GROUP_DRAG_TYPE, NODE_DRAG_TYPE };
