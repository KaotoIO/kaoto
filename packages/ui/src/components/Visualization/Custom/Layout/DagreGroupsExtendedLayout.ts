import * as dagre from '@dagrejs/dagre';
import {
  DagreGroupsLayout,
  getGroupChildrenDimensions,
  Graph,
  GRAPH_LAYOUT_END_EVENT,
  LAYOUT_DEFAULTS,
  LayoutGroup,
  Point,
} from '@patternfly/react-topology';
import { DagreLink } from './DagreLink';
import { DagreNode } from './DagreNode';

/**
 * This class extends the DagreGroupsLayout class to provide a consistent
 * layout for groups and nodes in a graph. It uses an index provided by the
 * canvas.service.ts to determine the order of the nodes and groups in the
 * graph.
 *
 * Related issue: https://github.com/patternfly/react-topology/issues/230
 */
export class DagreGroupsExtendedLayout extends DagreGroupsLayout {
  protected startLayout(graph: Graph, initialRun: boolean, addingNodes: boolean): void {
    if (initialRun || addingNodes) {
      const doLayout = (parentGroup?: LayoutGroup) => {
        const dagreGraph = new dagre.graphlib.Graph({ compound: true });
        const options = { ...this.dagreOptions };

        Object.keys(LAYOUT_DEFAULTS).forEach((key) => delete options[key as keyof typeof options]);
        dagreGraph.setGraph(options);

        // Determine the groups, nodes, and edges that belong in this layout
        const layerGroups = this.groups.filter(
          (group) => group.parent?.id === parentGroup?.id || (!parentGroup && group.parent?.id === graph.getId()),
        );
        const layerNodes = this.nodes.filter(
          (n) =>
            n.element.getParent()?.getId() === parentGroup?.id ||
            (!parentGroup && n.element.getParent()?.getId() === graph.getId()),
        );
        const layerEdges = this.edges.filter(
          (edge) =>
            (layerGroups.find((n) => n.id === edge.sourceNode.id) ||
              layerNodes.find((n) => n.id === edge.sourceNode.id)) &&
            (layerGroups.find((n) => n.id === edge.targetNode.id) ||
              layerNodes.find((n) => n.id === edge.targetNode.id)),
        );

        const nodesOrder: { id: string; index: number; node: ReturnType<DagreNode['getUpdatableNode']> }[] = [];

        // Layout any child groups first
        layerGroups.forEach((group) => {
          doLayout(group);

          // Add the child group node (now with the correct dimensions) to the graph
          const dagreNode = new DagreNode(group.element, group.padding);
          const updateNode = dagreNode.getUpdatableNode();
          nodesOrder.push({ id: group.id, index: group.element.getData().index, node: updateNode });
        });

        layerNodes?.forEach((node) => {
          const updateNode = (node as DagreNode).getUpdatableNode();
          nodesOrder.push({ id: node.id, index: node.element.getData().index, node: updateNode });
        });

        // Sort the nodes by their index
        nodesOrder.sort((a, b) => a.index - b.index);

        // Set the nodes in the order they were sorted
        nodesOrder.forEach((node) => {
          dagreGraph.setNode(node.id, node.node);
        });

        layerEdges?.forEach((dagreEdge) => {
          dagreGraph.setEdge(dagreEdge.source.id, dagreEdge.target.id, dagreEdge);
        });

        dagre.layout(dagreGraph);

        // Update the node element positions
        layerNodes.forEach((node) => {
          (node as DagreNode).updateToNode(dagreGraph.node(node.id));
        });

        // Update the group element positions (setting the group's positions updates its children)
        layerGroups.forEach((node) => {
          const dagreNode = dagreGraph.node(node.id);
          node.element.setPosition(new Point(dagreNode.x, dagreNode.y));
        });

        this.updateEdgeBendpoints(this.edges as DagreLink[]);

        // now that we've laid out the children, set the dimensions on the group (not on the graph)
        if (parentGroup) {
          parentGroup.element.setDimensions(getGroupChildrenDimensions(parentGroup.element));
        }
      };

      doLayout();
    }

    if (this.dagreOptions.layoutOnDrag) {
      this.forceSimulation.useForceSimulation(this.nodes, this.edges, this.getFixedNodeDistance);
    } else {
      this.graph.getController().fireEvent(GRAPH_LAYOUT_END_EVENT, { graph: this.graph });
    }
  }
}
