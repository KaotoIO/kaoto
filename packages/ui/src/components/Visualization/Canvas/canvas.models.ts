import { EdgeModel, NodeModel } from '@patternfly/react-topology';
import { VisualizationNode } from '../../../models/visualization';

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

/**
 * The intention of these types is to isolate the usage of the
 * underlying rendering library tokens
 */
export interface CanvasNode extends NodeModel {
  parentNode?: string;
  data?: {
    vizNode?: VisualizationNode;
  };
}

export interface CanvasEdge extends EdgeModel {
  source: string;
  target: string;
}

export type CanvasNodesAndEdges = { nodes: CanvasNode[]; edges: CanvasEdge[] };
