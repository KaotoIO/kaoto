import { AbstractAnchor, Point, Rect } from '@patternfly/react-topology';

export class TargetAnchor extends AbstractAnchor {
  getLocation(reference: Point): Point {
    return this.closestPointOnRectangle(this.owner.getBounds(), reference);
  }

  getReferencePoint(): Point {
    return super.getReferencePoint();
  }

  private closestPointOnRectangle(rect: Rect, point: Point): Point {
    // Deconstruct the rectangle and point parameters
    const { x: rx, y: ry, width, height } = rect;
    const { x: px, y: py } = point;

    // Calculate the projections on the edges
    // For left edge
    const leftX = rx;
    const leftY = Math.max(ry, Math.min(py, ry + height));

    // For right edge
    const rightX = rx + width;
    const rightY = Math.max(ry, Math.min(py, ry + height));

    // For top edge
    const topX = Math.max(rx, Math.min(px, rx + width));
    const topY = ry;

    // For bottom edge
    const bottomX = Math.max(rx, Math.min(px, rx + width));
    const bottomY = ry + height;

    // Calculate distances to each edge projection
    const distances = [
      { x: leftX, y: leftY, dist: Math.hypot(px - leftX, py - leftY) },
      { x: rightX, y: rightY, dist: Math.hypot(px - rightX, py - rightY) },
      { x: topX, y: topY, dist: Math.hypot(px - topX, py - topY) },
      { x: bottomX, y: bottomY, dist: Math.hypot(px - bottomX, py - bottomY) },
    ];

    // Find the minimum distance
    const closestPoint = distances.reduce(
      (minPoint, currentPoint) => (currentPoint.dist < minPoint.dist ? currentPoint : minPoint),
      { x: 0, y: 0, dist: Number.MAX_SAFE_INTEGER },
    );

    // Return the closest point
    return new Point(closestPoint.x, closestPoint.y);
  }
}
