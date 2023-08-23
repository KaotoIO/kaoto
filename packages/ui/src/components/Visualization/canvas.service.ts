import {
  BreadthFirstLayout,
  ColaGroupsLayout,
  ColaLayout,
  ConcentricLayout,
  DagreLayout,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  EdgeModel,
  EdgeStyle,
  ForceLayout,
  Graph,
  GraphComponent,
  GridLayout,
  Layout,
  ModelKind,
  NodeModel,
  NodeShape,
  Visualization,
} from '@patternfly/react-topology';
import { v4 as uuidv4 } from 'uuid';
import { CamelRoute, Step } from '../../camel-entities';

export const enum LayoutType {
  BreadthFirst = 'BreadthFirst',
  Cola = 'Cola',
  ColaNoForce = 'ColaNoForce',
  Concentric = 'Concentric',
  Dagre = 'Dagre',
  Force = 'Force',
  Grid = 'Grid',
  ColaGroups = 'ColaGroups',
}

export class CanvasService {
  static readonly DEFAULT_NODE_SHAPE = NodeShape.ellipse;
  static readonly DEFAULT_NODE_DIAMETER = 75;
  static readonly DEFAULT_GROUP_PADDING = 50;

  static getNewEdge(source: string, target: string): EdgeModel {
    return {
      id: uuidv4(),
      type: 'edge',
      source,
      target,
      edgeStyle: EdgeStyle.dashed,
    };
  }

  static getNewNode(label: string): NodeModel {
    return {
      id: label,
      type: 'node',
      label,
      width: this.DEFAULT_NODE_DIAMETER,
      height: this.DEFAULT_NODE_DIAMETER,
      shape: this.DEFAULT_NODE_SHAPE,
    };
  }

  static getNewGroup(children: string[], label: string): NodeModel {
    return {
      id: uuidv4(),
      type: 'group',
      group: true,
      label,
      children,
      width: this.DEFAULT_NODE_DIAMETER,
      height: this.DEFAULT_NODE_DIAMETER,
      shape: this.DEFAULT_NODE_SHAPE,
      style: {
        padding: this.DEFAULT_GROUP_PADDING,
      },
    };
  }

  static createController(): Visualization {
    const newController = new Visualization();

    newController.registerLayoutFactory(this.baselineLayoutFactory);
    newController.registerComponentFactory(this.baselineComponentFactory);

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
            return DefaultNode;
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
        return new DagreLayout(graph, { rankdir: 'LR' });
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

  static getNodesAndEdges(flow: CamelRoute): { nodes: NodeModel[]; edges: EdgeModel[] } {
    const { nodes, edges } = this.getNodesAndEdgesFromSteps(flow._getSteps());

    const group = this.getNewGroup(
      nodes.map((node) => node.id),
      flow._id,
    );
    nodes.push(group);

    console.log({ group, nodes, edges });

    return { nodes, edges };
  }

  private static getNodesAndEdgesFromSteps(steps: Step[]): { nodes: NodeModel[]; edges: EdgeModel[] } {
    const nodes: NodeModel[] = [];
    const edges: EdgeModel[] = [];

    steps.forEach((childStep) => {
      const { nodes: childNodes, edges: childEdges } = this.getNodesAndEdgesFromStep(childStep);
      nodes.push(...childNodes);
      edges.push(...childEdges);
    });

    return { nodes, edges };
  }

  private static getNodesAndEdgesFromStep(step: Step): { nodes: NodeModel[]; edges: EdgeModel[] } {
    const nodes: NodeModel[] = [];
    const edges: EdgeModel[] = [];

    const node = this.getNewNode(step.name);
    nodes.push(node);

    const { nodes: childNodes, edges: childEdges } = this.getNodesAndEdgesFromSteps(step.steps);
    nodes.push(...childNodes);
    edges.push(...childEdges);

    return { nodes, edges };
  }
}
