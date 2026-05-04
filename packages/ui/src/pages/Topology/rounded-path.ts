import { Point } from '@patternfly/react-topology';

/**
 * Build an SVG path that connects all given points and rounds every corner
 * with a quadratic Bezier curve of the given radius. The first and last
 * points act as the path endpoints, every intermediate point becomes a
 * control point of the smoothing curve.
 */
export const buildRoundedPath = (points: Point[], radius: number): string => {
  if (points.length < 2) {
    return '';
  }
  if (points.length === 2) {
    return `M${points[0].x} ${points[0].y} L${points[1].x} ${points[1].y}`;
  }

  let d = `M${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dxIn = curr.x - prev.x;
    const dyIn = curr.y - prev.y;
    const lenIn = Math.hypot(dxIn, dyIn) || 1;
    const rIn = Math.min(radius, lenIn / 2);

    const dxOut = next.x - curr.x;
    const dyOut = next.y - curr.y;
    const lenOut = Math.hypot(dxOut, dyOut) || 1;
    const rOut = Math.min(radius, lenOut / 2);

    const approachX = curr.x - (dxIn / lenIn) * rIn;
    const approachY = curr.y - (dyIn / lenIn) * rIn;
    const exitX = curr.x + (dxOut / lenOut) * rOut;
    const exitY = curr.y + (dyOut / lenOut) * rOut;

    d += ` L${approachX} ${approachY} Q${curr.x} ${curr.y} ${exitX} ${exitY}`;
  }

  const last = points[points.length - 1];
  d += ` L${last.x} ${last.y}`;
  return d;
};
