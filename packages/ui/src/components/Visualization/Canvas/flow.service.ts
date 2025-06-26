import { EdgeStyle } from '@patternfly/react-topology';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, CanvasNodesAndEdges } from './canvas.models';

export class FlowService {
  static nodes: CanvasNode[] = [];
  static edges: CanvasEdge[] = [];
  private static visitedNodes: string[] = [];
  private static additionalGroupNodes: string[] = [];

  static getFlowDiagram(scope: string, vizNode: IVisualizationNode): CanvasNodesAndEdges {
    this.nodes = [];
    this.edges = [];
    this.visitedNodes = [];

    this.appendNodesAndEdges(vizNode);

    this.nodes.forEach((node) => {
      node.id = `${scope}|${node.id}`;
      node.children = node.children?.map((child) => `${scope}|${child}`);
      node.parentNode = node.parentNode ? `${scope}|${node.parentNode}` : undefined;
    });
    this.edges.forEach((edge) => {
      edge.id = `${scope}|${edge.id}`;
      edge.source = `${scope}|${edge.source}`;
      edge.target = `${scope}|${edge.target}`;
    });

    return { nodes: this.nodes, edges: this.edges };
  }

  /** Method for iterating over all the IVisualizationNode and its children using a depth-first algorithm */
  private static appendNodesAndEdges(vizNodeParam: IVisualizationNode): void {
    if (this.visitedNodes.includes(vizNodeParam.id)) {
      return;
    }

    let node: CanvasNode;
    const children = vizNodeParam.getChildren();
    const parentNodeId = vizNodeParam.getParentNode()?.id;

    if (vizNodeParam.data.nodeType === 'choice') {
      // Create Choice as a regular node
      node = this.getNode(vizNodeParam.id, {
        parentNode: parentNodeId,
        data: { vizNode: vizNodeParam },
      });
      node.type = 'choice';

      const choiceNextNode = { ...vizNodeParam.getNextNode() };
      vizNodeParam.setNextNode(undefined);

      // Process all When/Otherwise and create edges directly to their children
      if (children) {
        children.forEach((whenOrOtherwise) => {
          whenOrOtherwise.setNextNode(choiceNextNode[0]);
          this.appendNodesAndEdges(whenOrOtherwise);
        });
        children.map((whenOrOtherwise) => {
          this.additionalGroupNodes.push(whenOrOtherwise.id);
          vizNodeParam.addNextNode(whenOrOtherwise);
        });
      }
    } else if (vizNodeParam.data.isGroup && children) {
      children.forEach((child) => {
        this.appendNodesAndEdges(child);
      });

      const containerId = vizNodeParam.id;
      node = this.getGroup(containerId, {
        label: containerId,
        children: [...children.map((child) => child.id), ...this.additionalGroupNodes],
        parentNode: parentNodeId,
        data: { vizNode: vizNodeParam },
      });
      this.additionalGroupNodes = [];
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
      vizNodeParam.getNextNode()!.forEach((nextNode) => {
        edges.push(this.getEdge(vizNodeParam.id, nextNode.id));
      });
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
      id: `${source} >>> ${target}`,
      type: 'edge',
      source,
      target,
      edgeStyle: EdgeStyle.solid,
    };
  }
}
