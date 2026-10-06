import { CanvasOverlay } from './overlay-layer-snapshot';
import { OverlayAnnotation } from './OverlayAnnotation';
import { EdgeOverlayHighlight, NodeOverlayHighlight } from './OverlayHighlight';

interface Point {
  x: number;
  y: number;
}
interface Bounds extends Point {
  width: number;
  height: number;
}
interface OverlayProps {
  overlays?: readonly CanvasOverlay[];
}

/** Midpoint along the rendered polyline, including bends rather than its bounding box. */
export function getOverlayEdgeMidpoint(points: readonly Point[]): Point {
  const lengths = points
    .slice(1)
    .map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index];
    if (length > 0 && remaining <= length) {
      const ratio = remaining / length;
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * ratio,
        y: points[index].y + (points[index + 1].y - points[index].y) * ratio,
      };
    }
    remaining -= length;
  }
  return points[0] ?? { x: 0, y: 0 };
}

const Annotations = ({
  overlays = [],
  anchor,
  align = 'center',
}: OverlayProps & { anchor: Point; align?: 'center' | 'start' }) => (
  <>
    {overlays
      .filter(({ entry }) => entry.kind === 'annotation')
      .map(
        ({ key, entry }, index) =>
          entry.kind === 'annotation' && (
            <foreignObject
              key={key}
              className={`kaoto-canvas-annotations kaoto-canvas-annotations--${align}`}
              x={anchor.x - (align === 'center' ? 80 : 0)}
              y={anchor.y - 32 * (index + 1)}
              width={160}
              height={28}
            >
              <OverlayAnnotation entry={entry} />
            </foreignObject>
          ),
      )}
  </>
);

/** Called inside the node/group renderer with its own coordinates and object data. */
export const CanvasNodeOverlays = ({
  overlays,
  bounds,
  vertical = false,
}: OverlayProps & { bounds: Bounds; vertical?: boolean }) =>
  overlays?.length ? (
    <g className="kaoto-canvas-overlays">
      {overlays
        ?.filter(({ entry }) => entry.kind === 'highlight')
        .map(({ key, entry }) => (
          <NodeOverlayHighlight key={key} bounds={bounds} tone={entry.tone} emphasis={entry.emphasis} />
        ))}
      <Annotations
        overlays={overlays}
        anchor={{ x: bounds.x + bounds.width / 2 + (vertical ? 10 : 0), y: bounds.y - 8 }}
        align={vertical ? 'start' : 'center'}
      />
    </g>
  ) : null;

export const CanvasEdgeOverlays = ({
  overlays,
  path,
  points,
}: OverlayProps & { path: string; points: readonly Point[] }) =>
  overlays?.length ? (
    <g className="kaoto-canvas-overlays">
      {overlays
        ?.filter(({ entry }) => entry.kind === 'highlight')
        .map(({ key, entry }) => (
          <EdgeOverlayHighlight key={key} path={path} tone={entry.tone} emphasis={entry.emphasis} />
        ))}
      <Annotations overlays={overlays} anchor={getOverlayEdgeMidpoint(points)} />
    </g>
  ) : null;
