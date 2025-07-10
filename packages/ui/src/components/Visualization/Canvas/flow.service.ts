import { IVisualizationNode, VizNodeWithEdges } from '../../../models/visualization/base-visual-entity';
import { CanvasDefaults } from './canvas.defaults';
import { CanvasEdge, CanvasNode, CanvasNodesAndEdges } from './canvas.models';
import { NodeShape } from '@patternfly/react-topology';

export class FlowService {
  static nodes: CanvasNode[] = [];
  static edges: CanvasEdge[] = [];
  private static visitedNodes: string[] = [];
  private static groupNodesStack: string[][] = [];

  static getFlowDiagram(scope: string, nodeWithEdges: VizNodeWithEdges): CanvasNodesAndEdges {
    this.nodes = [];
    this.visitedNodes = [];
    console.log(nodeWithEdges);
    this.appendNodes(nodeWithEdges.vizNode);

    this.nodes.forEach((node) => {
      node.id = `${scope}|${node.id}`;
      node.children = node.children?.map((child) => `${scope}|${child}`);
      node.parentNode = node.parentNode ? `${scope}|${node.parentNode}` : undefined;
    });
    nodeWithEdges.edges.forEach((edge) => {
      edge.id = `${scope}|${edge.id}`;
      edge.source = `${scope}|${edge.source}`;
      edge.target = `${scope}|${edge.target}`;
    });

    return { nodes: this.nodes, edges: nodeWithEdges.edges };
  }

  /** Method for iterating over all the IVisualizationNode and its children using a depth-first algorithm */
  private static appendNodes(vizNodeParam: IVisualizationNode): void {
    if (this.visitedNodes.includes(vizNodeParam.id)) {
      return;
    }

    let node: CanvasNode = this.getCanvasNode(vizNodeParam);
    const children = vizNodeParam.getChildren();
    const parentNodeId = vizNodeParam.getParentNode()?.id;

    if (vizNodeParam.data.isGroup) this.groupNodesStack.push([]);

    if (children) {
      children.forEach((branchChild) => {
        this.groupNodesStack[this.groupNodesStack.length - 1].push(branchChild.id);
        this.appendNodes(branchChild);
      });

      if (vizNodeParam.data.isGroup) {
        const containerId = vizNodeParam.id;

        node = this.getGroup(containerId, {
          label: containerId,
          children: [...this.groupNodesStack.pop()!],
          parentNode: parentNodeId,
          data: { vizNode: vizNodeParam },
        });
      }
    }
    /** Add node */
    this.nodes.push(node);

    this.visitedNodes.push(node.id);
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
      shape: NodeShape.circle,
    };
  }
}
