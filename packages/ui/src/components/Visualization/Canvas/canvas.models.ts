import { EdgeModel, NodeModel } from '@patternfly/react-topology';

import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import type { CanvasOverlayData } from '../Overlay/canvas-overlay-data';

export const enum LayoutType {
  DagreVertical = 'DagreVertical',
  DagreHorizontal = 'DagreHorizontal',
}

/**
 * The intention of these types is to isolate the usage of the
 * underlying rendering library tokens
 */
export interface CanvasNodeData extends CanvasOverlayData {
  vizNode?: IVisualizationNode;
}

export interface CanvasNode extends NodeModel {
  parentNode?: string;
  data?: CanvasNodeData;
}

export interface CanvasEdgeData extends CanvasOverlayData {
  [key: string]: unknown;
}

export interface CanvasEdge extends EdgeModel {
  data?: CanvasEdgeData;
  source: string;
  target: string;
}

export type CanvasNodesAndEdges = { nodes: CanvasNode[]; edges: CanvasEdge[] };
