import { EdgeStyle } from '@patternfly/react-topology';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, CanvasNodesAndEdges } from './canvas.models';

export class FlowService {
  static nodes: CanvasNode[] = [];
  static edges: CanvasEdge[] = [];
  private static visitedNodes: string[] = [];

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

    let node: CanvasNode;

    const children = vizNodeParam.getChildren();
    if (vizNodeParam.data.isGroup && children) {
      children.forEach((child) => {
        this.appendNodesAndEdges(child);
      });

      const containerId = vizNodeParam.id;
      node = this.getGroup(containerId, {
        label: containerId,
        children: children.map((child) => child.id),
        parentNode: vizNodeParam.getParentNode()?.id,
        data: { vizNode: vizNodeParam },
      });
    } else {
      node = this.getCanvasNode(vizNodeParam);
    }

    /** Add node */
    this.nodes.push(node);
    this.visitedNodes.push(node.id);

    /** Add edges */
    this.edges.push(...this.getEdgesFromVizNode(vizNodeParam));
  }

  private static getCanvasNode(vizNodeParam: IVisualizationNode): CanvasNode {
    /** Join the parent if exist to form a group */
    const parentNode =
      vizNodeParam.getParentNode()?.getChildren() !== undefined ? vizNodeParam.getParentNode()?.id : undefined;

    const canvasNode = this.getNode(vizNodeParam.id, {
      parentNode,
      data: { vizNode: vizNodeParam },
    });

    if (vizNodeParam.data.isPlaceholder) {
      canvasNode.type = 'node-placeholder';
    }

    return canvasNode;
  }

  private static getEdgesFromVizNode(vizNodeParam: IVisualizationNode): CanvasEdge[] {
    const edges: CanvasEdge[] = [];

    if (vizNodeParam.getNextNode() !== undefined) {
      edges.push(this.getEdge(vizNodeParam.id, vizNodeParam.getNextNode()!.id));
    }

    return edges;
  }

  private static getGroup(
    id: string,
    options: { label?: string; children?: string[]; parentNode?: string; data?: CanvasNode['data'] } = {},
  ): CanvasNode {
    return {
      id,
      type: 'group',
      group: true,
      label: options.label ?? id,
      children: options.children ?? [],
      parentNode: options.parentNode,
      data: options.data,
      style: {
        padding: CanvasDefaults.DEFAULT_GROUP_PADDING,
      },
    };
  }

  private static getNode(id: string, options: { parentNode?: string; data?: CanvasNode['data'] } = {}): CanvasNode {
    return {
      id,
      type: 'node',
      parentNode: options.parentNode,
      data: options.data,
      width: CanvasDefaults.DEFAULT_NODE_WIDTH,
      height: CanvasDefaults.DEFAULT_NODE_HEIGHT,
      shape: CanvasDefaults.DEFAULT_NODE_SHAPE,
    };
  }

  private static getEdge(source: string, target: string): CanvasEdge {
    return {
      id: `${source}-to-${target}`,
      type: 'edge',
      source,
      target,
      edgeStyle: EdgeStyle.solid,
    };
  }
}
