import { BaseEdge, Point } from '@patternfly/react-topology';

export class NoBendpointsEdge extends BaseEdge {
  getBendpoints(): Point[] {
    return [];
  }
}
