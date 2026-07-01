import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CanvasNodesAndEdges } from './Canvas/canvas.models';
import { FlowService } from './Canvas/flow.service';

export function buildTopologyCanvasModel(vizNodes: IVisualizationNode[]): CanvasNodesAndEdges {
  return FlowService.getTopologyFlowDiagram(vizNodes);
}
