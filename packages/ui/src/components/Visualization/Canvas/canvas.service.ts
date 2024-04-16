import {
  BreadthFirstLayout,
  ColaGroupsLayout,
  ColaLayout,
  ComponentFactory,
  ConcentricLayout,
  DagreLayout,
  DefaultEdge,
  EdgeAnimationSpeed,
  EdgeStyle,
  ForceLayout,
  Graph,
  GraphComponent,
  GridLayout,
  Layout,
  Model,
  ModelKind,
  Visualization,
  withPanZoom,
} from '@patternfly/react-topology';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CustomGroupWithSelection, CustomNodeWithSelection } from '../Custom';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, CanvasNodesAndEdges, LayoutType } from './canvas.models';

export class CanvasService {
  static nodes: CanvasNode[] = [];
  static edges: CanvasEdge[] = [];
  private static visitedNodes: string[] = [];

  static createController(): Visualization {
    const newController = new Visualization();

    newController.registerLayoutFactory(this.baselineLayoutFactory);
    newController.registerComponentFactory(this.baselineComponentFactory);

    const defaultModel: Model = {
      graph: {
        id: 'default',
        type: 'graph',
      },
    };

    newController.fromModel(defaultModel, false);

    return newController;
  }

  static baselineComponentFactory(kind: ModelKind, type: string): ReturnType<ComponentFactory> {
    switch (type) {
      case 'group':
        return CustomGroupWithSelection;
      default:
        switch (kind) {
          case ModelKind.graph:
            return withPanZoom()(GraphComponent);
          case ModelKind.node:
            return CustomNodeWithSelection;
          case ModelKind.edge:
            return DefaultEdge;
          default:
            return undefined;
        }
    }
  }

  // ### dagre algo options, uses default value on undefined ###
  // nodeSep: undefined, // the separation between adjacent nodes in the same rank
  // edgeSep: undefined, // the separation between adjacent edges in the same rank
  // rankSep: undefined, // the separation between each rank in the layout
  // rankDir: undefined, // 'TB' for top to bottom flow, 'LR' for left to right,
  // align: undefined,  // alignment for rank nodes. Can be 'UL', 'UR', 'DL', or 'DR', where U = up, D = down, L = left, and R = right
  // acyclicer: undefined, // If set to 'greedy', uses a greedy heuristic for finding a feedback arc set for a graph.
  // A feedback arc set is a set of edges that can be removed to make a graph acyclic.
  // ranker: undefined, // Type of algorithm to assign a rank to each node in the input graph. Possible values: 'network-simplex', 'tight-tree' or 'longest-path'
  // minLen: function( edge ){ return 1; }, // number of ranks to keep between the source and target of the edge
  // edgeWeight: function( edge ){ return 1; }, // higher weight edges are generally made shorter and straighter than lower weight edges

  // ### general layout options ###
  // fit: true, // whether to fit to viewport
  // padding: 30, // fit padding
  // spacingFactor: undefined, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
  // nodeDimensionsIncludeLabels: false, // whether labels should be included in determining the space used by a node
  // animate: false, // whether to transition the node positions
  // animateFilter: function( node, i ){ return true; }, // whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
  // animationDuration: 500, // duration of animation in ms if enabled
  // animationEasing: undefined, // easing of animation if enabled
  // boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
  // transform: function( node, pos ){ return pos; }, // a function that applies a transform to the final node position
  // ready: function(){}, // on layoutready
  // sort: undefined, // a sorting function to order the nodes and edges; e.g. function(a, b){ return a.data('weight') - b.data('weight') }
  // because cytoscape dagre creates a directed graph, and directed graphs use the node order as a tie breaker when
  // defining the topology of a graph, this sort function can help ensure the correct order of the nodes/edges.
  // this feature is most useful when adding and removing the same nodes and edges multiple times in a graph.
  // stop: function(){} // on layoutstop
  static baselineLayoutFactory(type: string, graph: Graph): Layout | undefined {
    switch (type) {
      case LayoutType.BreadthFirst:
        return new BreadthFirstLayout(graph);
      case LayoutType.Cola:
        return new ColaLayout(graph);
      case LayoutType.ColaNoForce:
        return new ColaLayout(graph, { layoutOnDrag: false });
      case LayoutType.Concentric:
        return new ConcentricLayout(graph);
      case LayoutType.DagreVertical:
        return new DagreLayout(graph, {
          rankdir: 'TB',
          ranker: 'network-simplex',
          nodesep: 20,
          edgesep: 20,
          ranksep: 0,
        });
      case LayoutType.DagreHorizontal:
        return new DagreLayout(graph, {
          rankdir: 'LR',
          ranker: 'network-simplex',
          nodesep: 20,
          edgesep: 20,
          ranksep: 0,
        });
      case LayoutType.Force:
        return new ForceLayout(graph);
      case LayoutType.Grid:
        return new GridLayout(graph);
      case LayoutType.ColaGroups:
        return new ColaGroupsLayout(graph, { layoutOnDrag: false });
      default:
        return new ColaLayout(graph, { layoutOnDrag: false });
    }
  }

  static getFlowDiagram(vizNode: IVisualizationNode): CanvasNodesAndEdges {
    this.nodes = [];
    this.edges = [];
    this.visitedNodes = [];

    const children = vizNode.getChildren();
    if (vizNode.data.isGroup && children) {
      children.forEach((child) => this.appendNodesAndEdges(child));
      const containerId = vizNode.getBaseEntity()?.getId() ?? 'Unknown';
      const group = this.getContainer(containerId, {
        label: containerId,
        children: this.visitedNodes,
        data: { vizNode },
      });
      this.nodes.push(group);
    } else {
      this.appendNodesAndEdges(vizNode);
    }

    return { nodes: this.nodes, edges: this.edges };
  }

  /** Method for iterating over all the IVisualizationNode and its children using a depth-first algorithm */
  private static appendNodesAndEdges(vizNodeParam: IVisualizationNode): void {
    if (this.visitedNodes.includes(vizNodeParam.id)) {
      return;
    }

    const node = this.getCanvasNode(vizNodeParam);

    /** Add node */
    this.nodes.push(node);
    this.visitedNodes.push(node.id);

    /** Add edges */
    this.edges.push(...this.getEdgesFromVizNode(vizNodeParam));

    /** Traverse the children nodes */
    const children = vizNodeParam.getChildren();
    if (children !== undefined) {
      children.forEach((child) => {
        this.appendNodesAndEdges(child);
      });
    }

    /** Traverse the next node */
    const nextNode = vizNodeParam.getNextNode();
    if (nextNode !== undefined) {
      this.appendNodesAndEdges(nextNode);
    }
  }

  private static getCanvasNode(vizNodeParam: IVisualizationNode): CanvasNode {
    /** Join the parent if exist to form a group */
    const parentNode =
      vizNodeParam.getParentNode()?.getChildren() !== undefined ? vizNodeParam.getParentNode()?.id : undefined;

    return this.getNode(vizNodeParam.id, {
      parentNode,
      data: { vizNode: vizNodeParam },
    });
  }

  private static getEdgesFromVizNode(vizNodeParam: IVisualizationNode): CanvasEdge[] {
    const edges: CanvasEdge[] = [];

    /** Connect to previous node if it doesn't have children */
    if (vizNodeParam.getPreviousNode() !== undefined && vizNodeParam.getPreviousNode()?.getChildren() === undefined) {
      edges.push(this.getEdge(vizNodeParam.getPreviousNode()!.id, vizNodeParam.id));
    }

    /** Connect to the parent if it's not a group and there is no previous node */
    if (
      vizNodeParam.getParentNode() !== undefined &&
      !vizNodeParam.getParentNode()?.data.isGroup &&
      vizNodeParam.getPreviousNode() === undefined
    ) {
      edges.push(this.getEdge(vizNodeParam.getParentNode()!.id, vizNodeParam.id));
    }

    /** Connect to each leaf of the previous node */
    if (vizNodeParam.getPreviousNode() !== undefined && vizNodeParam.getPreviousNode()?.getChildren() !== undefined) {
      const leafNodesIds: string[] = [];
      vizNodeParam.getPreviousNode()!.populateLeafNodesIds(leafNodesIds);

      leafNodesIds.forEach((leafNodeId) => {
        edges.push(this.getEdge(leafNodeId, vizNodeParam.id));
      });
    }

    return edges;
  }

  private static getContainer(
    id: string,
    options: { label?: string; children?: string[]; data?: CanvasNode['data'] } = {},
  ): CanvasNode {
    return {
      id,
      type: 'group',
      group: true,
      label: options.label ?? id,
      children: options.children ?? [],
      data: options.data,
      style: {
        padding: CanvasDefaults.DEFAULT_NODE_DIAMETER * 0.8,
      },
    };
  }

  private static getNode(id: string, options: { parentNode?: string; data?: CanvasNode['data'] } = {}): CanvasNode {
    return {
      id,
      type: 'node',
      parentNode: options.parentNode,
      data: options.data,
      width: CanvasDefaults.DEFAULT_NODE_DIAMETER,
      height: CanvasDefaults.DEFAULT_NODE_DIAMETER,
      shape: CanvasDefaults.DEFAULT_NODE_SHAPE,
    };
  }

  private static getEdge(source: string, target: string): CanvasEdge {
    return {
      id: `${source}-to-${target}`,
      type: 'edge',
      source,
      target,
      edgeStyle: EdgeStyle.dashed,
      animationSpeed: EdgeAnimationSpeed.medium,
    };
  }
}
