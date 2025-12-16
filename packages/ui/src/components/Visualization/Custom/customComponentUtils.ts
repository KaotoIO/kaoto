import { DropTargetSpec, Edge, EdgeModel, GraphElement, GraphElementProps } from '@patternfly/react-topology';

import { CatalogModalContextValue } from '../../../dynamic-catalog/catalog-modal.provider';
import { AddStepMode, IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { EntitiesContextResult } from '../../../providers';

const NODE_DRAG_TYPE = '#node#';

const customGroupExpandedDropTargetSpec: DropTargetSpec<GraphElement, unknown, object, GraphElementProps> = {
  accept: ['#node#'],
  canDrop: () => {
    return false;
  },
  collect: (monitor) => ({
    droppable: monitor.isDragging(),
  }),
};

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

  const filter = camelResource.getCompatibleComponents(
    AddStepMode.PrependStep,
    followingVizNode.data,
    followingVizNode.getNodeDefinition(),
  );
  return catalogModalContext.checkCompatibility(draggedVizNode.getCopiedContent()!.name, filter) ?? false;
};

export { canDropOnEdge, customGroupExpandedDropTargetSpec, NODE_DRAG_TYPE };
