import { EdgeModel, NodeModel } from '@patternfly/react-topology';

import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';

export const enum LayoutType {
  DagreVertical = 'DagreVertical',
  DagreHorizontal = 'DagreHorizontal',
}

/**
 * The intention of these types is to isolate the usage of the
 * underlying rendering library tokens
 */
export interface CanvasNode extends NodeModel {
  parentNode?: string;
  data?: {
    vizNode?: IVisualizationNode;
  };
}

export interface CanvasEdge extends EdgeModel {
  source: string;
  target: string;
}

export type CanvasNodesAndEdges = { nodes: CanvasNode[]; edges: CanvasEdge[] };
