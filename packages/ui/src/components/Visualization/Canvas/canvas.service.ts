import {
  BreadthFirstLayout,
  ColaGroupsLayout,
  ColaLayout,
  ConcentricLayout,
  DagreLayout,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  EdgeAnimationSpeed,
  EdgeStyle,
  ForceLayout,
  Graph,
  GraphComponent,
  GridLayout,
  Layout,
  Model,
  ModelKind,
  NodeShape,
  Visualization,
  withSelection,
} from '@patternfly/react-topology';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CanvasEdge, CanvasNode, CanvasNodesAndEdges, LayoutType } from './canvas.models';

export class CanvasService {
  static readonly DEFAULT_LAYOUT = LayoutType.Dagre;
  static readonly DEFAULT_NODE_SHAPE = NodeShape.ellipse;
  static readonly DEFAULT_NODE_DIAMETER = 75;
  static readonly DEFAULT_GROUP_PADDING = 50;

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

  static baselineComponentFactory(kind: ModelKind, type: string) {
    switch (type) {
      case 'group':
        return DefaultGroup;
      default:
        switch (kind) {
          case ModelKind.graph:
            return GraphComponent;
          case ModelKind.node:
            return withSelection()(DefaultNode);
          case ModelKind.edge:
            return DefaultEdge;
          default:
            return undefined;
        }
    }
  }

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
      case LayoutType.Dagre:
        return new DagreLayout(graph, { rankdir: 'TB' });
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
    this.appendNodesAndEdges(vizNode);

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
      label: vizNodeParam.label,
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

    /** Connect to the parent if there is no previous node */
    if (vizNodeParam.getParentNode() !== undefined && vizNodeParam.getPreviousNode() === undefined) {
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

  private static getNode(
    id: string,
    options: { label?: string; parentNode?: string; data?: CanvasNode['data'] } = {},
  ): CanvasNode {
    return {
      id,
      type: 'node',
      label: options.label ?? id,
      parentNode: options.parentNode,
      data: options.data,
      width: this.DEFAULT_NODE_DIAMETER,
      height: this.DEFAULT_NODE_DIAMETER,
      shape: this.DEFAULT_NODE_SHAPE,
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
