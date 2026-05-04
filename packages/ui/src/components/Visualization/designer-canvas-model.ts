import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CanvasEdge, CanvasNode, CanvasNodesAndEdges } from './Canvas/canvas.models';
import { FlowService } from './Canvas/flow.service';

export function buildDesignerCanvasModel(vizNodes: IVisualizationNode[]): CanvasNodesAndEdges {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  vizNodes.forEach((vizNode) => {
    const { nodes: childNodes, edges: childEdges } = FlowService.getFlowDiagram(vizNode.getId() ?? vizNode.id, vizNode);
    nodes.push(...childNodes);
    edges.push(...childEdges);
  });

  return { nodes, edges };
}
