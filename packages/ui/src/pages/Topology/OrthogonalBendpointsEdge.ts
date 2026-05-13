import { BaseEdge, Point } from '@patternfly/react-topology';

import { LayoutType } from '../../components/Visualization/Canvas/canvas.models';

/**
 * Edge element that bends twice to produce orthogonal (stepped) lines:
 * one segment along the layout's primary axis, a perpendicular step in the
 * middle, then another segment along the primary axis to the target.
 */
export class OrthogonalBendpointsEdge extends BaseEdge {
  getBendpoints(): Point[] {
    const source = this.getSource();
    const target = this.getTarget();
    if (!source || !target || source === target) {
      return [];
    }

    const sourcePos = source.getPosition();
    const sourceSize = source.getDimensions();
    const targetPos = target.getPosition();
    const targetSize = target.getDimensions();

    const startX = sourcePos.x + sourceSize.width / 2;
    const startY = sourcePos.y + sourceSize.height / 2;
    const endX = targetPos.x + targetSize.width / 2;
    const endY = targetPos.y + targetSize.height / 2;

    // Edges may briefly be queried before they're attached to the graph. Default to
    // horizontal so we always return a sensible bend pair even in that window.
    const graph = this.getGraph?.();
    const isHorizontal = graph?.getLayout?.() !== LayoutType.DagreVertical;

    if (isHorizontal) {
      const midX = (startX + endX) / 2;
      return [new Point(midX, startY), new Point(midX, endY)];
    }
    const midY = (startY + endY) / 2;
    return [new Point(startX, midY), new Point(endX, midY)];
  }
}
