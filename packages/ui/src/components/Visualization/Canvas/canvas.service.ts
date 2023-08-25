import Dagre from '@dagrejs/dagre';
import { Edge, Node } from 'reactflow';
import { VisualizationNode } from '../../../models/visualization';

type NodesAndEdges = { nodes: Node[]; edges: Edge[] };

export class CanvasService {
  static nodes: Node[] = [];
  static edges: Edge[] = [];
  static visitedNodes: string[] = [];

  static getFlowChart(vizNode: VisualizationNode): NodesAndEdges {
    this.nodes = [];
    this.edges = [];
    this.visitedNodes = [];
    this.getNodesAndEdges(vizNode);

    console.log('this.nodes', this.nodes, vizNode);
    console.log('this.edges', this.edges);
    const positionedFlowChart = this.getLayoutedElements(this.nodes, this.edges);
    return { nodes: positionedFlowChart.nodes, edges: positionedFlowChart.edges };
  }

  /** Method for iterating over all the VisualizationNode and its children using a depth-first algorithm */
  static getNodesAndEdges(vizNodeParam: VisualizationNode) {
    if (this.visitedNodes.includes(vizNodeParam.id)) {
      return;
    }

    console.log('vizNodeParam', vizNodeParam.id, vizNodeParam.label);
    const node = vizNodeParam.toNode();

    /** Add node */
    this.nodes.push(node);
    this.visitedNodes.push(node.id);

    /** Add edges */
    this.edges.push(...vizNodeParam.getEdges());

    /** Traverse the children nodes */
    const children = vizNodeParam.getChildren();
    if (children !== undefined) {
      children.forEach((child) => {
        this.getNodesAndEdges(child);
      });
    }

    /** Traverse the next node */
    const nextNode = vizNodeParam.getNextNode();
    if (nextNode !== undefined) {
      this.getNodesAndEdges(nextNode);
    }
  }

  private static getLayoutedElements(nodes: Node[], edges: Edge[]): NodesAndEdges {
    const graph = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: 'TB',
    });

    edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
    nodes.forEach((node) => {
      graph.setNode(node.id, { width: node.style!.width, height: node.style!.height });
    });

    Dagre.layout(graph);

    return {
      nodes: nodes.map((node) => {
        let { x, y } = graph.node(node.id);

        /** Position child node relatively to its parent */
        if (node.parentNode) {
          const parentNode = graph.node(node.parentNode);
          if (parentNode) {
            x = x - parentNode.x;
            y = y - parentNode.y;
          }
        }

        return { ...node, position: { x, y } };
      }),
      edges,
    };
  }
}
