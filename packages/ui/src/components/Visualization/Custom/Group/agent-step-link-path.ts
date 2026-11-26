import { isNode, Node, Point, Rect } from '@patternfly/react-topology';

import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { getRouteLinkExit, getRouteLinkStart, ROUTE_LINK_BUS_INSET } from '../route-link-anchor';

const CORNER_RADIUS = 6;
/** The space kept between a link and the steps it goes around */
const LANE_GAP = 8;
/**
 * How far inside a container the link runs along its far side, in the room its padding leaves: under the names of the
 * steps in a horizontal layout, past the names, which are wider than the steps, in a vertical one
 */
const CONTAINER_INSET = { horizontal: 10, vertical: 5 };

/**
 * The link from an agent step to where it leaves its route is drawn along two axes: the axis the steps flow along,
 * `m`, and the one across it, `c`, on which the link moves away from the steps towards the far side of the route,
 * where the links of all its agent steps leave it together.
 */
interface Span {
  mStart: number;
  mEnd: number;
  cStart: number;
  cEnd: number;
}

const toSpan = (rect: Rect, isHorizontal: boolean): Span =>
  isHorizontal
    ? { mStart: rect.x, mEnd: rect.right(), cStart: rect.y, cEnd: rect.bottom() }
    : { mStart: rect.y, mEnd: rect.bottom(), cStart: rect.x, cEnd: rect.right() };

const toPoint = (m: number, c: number, isHorizontal: boolean): Point =>
  isHorizontal ? new Point(m, c) : new Point(c, m);

const isExpandedGroup = (node: Node): boolean => node.isGroup() && !node.isCollapsed();

/** What a node takes on the canvas: the box of a container, or a step with the name drawn under it */
const getOccupiedSpan = (node: Node, isHorizontal: boolean): Span => {
  const bounds = node.getBounds();
  if (isExpandedGroup(node)) {
    return toSpan(bounds, isHorizontal);
  }
  const labelWidth = Math.max(bounds.width, CanvasDefaults.DEFAULT_LABEL_WIDTH);
  const occupied = new Rect(
    bounds.x + (bounds.width - labelWidth) / 2,
    bounds.y,
    labelWidth,
    bounds.height + CanvasDefaults.DEFAULT_LABEL_HEIGHT,
  );
  return toSpan(occupied, isHorizontal);
};

/**
 * The first position along the flow, from `from` on, where a line across the flow passes none of the steps and
 * containers that lie further across than `c`, so a link can go around the steps stacked beside its own.
 */
const getClearLane = (from: number, c: number, obstacles: Span[]): number => {
  const beyond = obstacles.filter((span) => span.cEnd > c + 1);
  let lane = from;
  let moved = true;
  while (moved) {
    moved = false;
    for (const span of beyond) {
      if (span.mStart - LANE_GAP < lane && lane < span.mEnd + LANE_GAP) {
        lane = span.mEnd + LANE_GAP;
        moved = true;
      }
    }
  }
  return lane;
};

/** Drops the points that repeat the previous one or lie on a straight line with their neighbours */
const simplify = (points: Point[]): Point[] =>
  points
    .filter((point, i) => i === 0 || Math.hypot(point.x - points[i - 1].x, point.y - points[i - 1].y) > 0.5)
    .filter((point, i, kept) => {
      if (i === 0 || i === kept.length - 1) return true;
      const [prev, next] = [kept[i - 1], kept[i + 1]];
      const cross = (point.x - prev.x) * (next.y - point.y) - (point.y - prev.y) * (next.x - point.x);
      return Math.abs(cross) > 0.5;
    });

/** Where the link of an agent step starts: under its name in a horizontal layout, on its right in a vertical one */
export const getAgentStepPort = (step: Node, isHorizontal: boolean): Point => {
  const bounds = step.getBounds();
  return isHorizontal
    ? new Point(bounds.x + bounds.width / 2, bounds.bottom() + CanvasDefaults.DEFAULT_LABEL_HEIGHT)
    : new Point(bounds.right(), bounds.y + bounds.height / 2);
};

/**
 * The points of the link from an agent step to where the links leave its route.
 *
 * From the step, the link moves across the flow to the far side of each container it is in, one container at a
 * time, up to the route, and then along the far side of the route and out of it, to where the link to the tools
 * starts. When steps or containers are stacked
 * beside the one it comes from, it first moves along the flow, past them, so it does not cross them.
 */
export const getAgentStepLinkPoints = (step: Node, route: Node, isHorizontal: boolean): Point[] => {
  const port = getAgentStepPort(step, isHorizontal);
  const stepSpan = getOccupiedSpan(step, isHorizontal);
  const points = [port];

  let m = isHorizontal ? port.x : port.y;
  /* In a vertical layout the name hangs under the step, wider than it, so the link first moves past it */
  let c = isHorizontal ? port.y : stepSpan.cEnd + LANE_GAP / 2;
  points.push(toPoint(m, c, isHorizontal));

  let element: Node = step;
  let parent = element.getParent();
  while (isNode(parent)) {
    const isRoute = parent === route;
    const parentSpan = toSpan(parent.getBounds(), isHorizontal);
    const siblings = parent
      .getChildren()
      .filter((child): child is Node => isNode(child) && child !== element && child.isVisible())
      .map((child) => getOccupiedSpan(child, isHorizontal));

    const lane = getClearLane(m, c, siblings);
    if (lane !== m) {
      /* Halfway between what the link goes around and the side of the container, if it is close */
      const passed = lane - LANE_GAP;
      m = Math.min(lane, (passed + parentSpan.mEnd) / 2);
      points.push(toPoint(m, c, isHorizontal));
    }

    const insets = isRoute ? ROUTE_LINK_BUS_INSET : CONTAINER_INSET;
    c = parentSpan.cEnd - insets[isHorizontal ? 'horizontal' : 'vertical'];
    points.push(toPoint(m, c, isHorizontal));
    if (isRoute) break;

    element = parent;
    parent = element.getParent();
  }

  /* Out of the route, up to where the link to the tools starts */
  points.push(getRouteLinkExit(route), getRouteLinkStart(route));
  return simplify(points);
};

/** An orthogonal path through the points, with rounded corners */
export const roundedPath = (points: Point[]): string => {
  const path = [`M${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length - 1; i++) {
    const [prev, corner, next] = [points[i - 1], points[i], points[i + 1]];
    const inLength = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const radius = Math.min(CORNER_RADIUS, inLength / 2, outLength / 2);
    if (radius < 0.5) {
      path.push(`L${corner.x} ${corner.y}`);
      continue;
    }
    const before = new Point(
      corner.x - ((corner.x - prev.x) / inLength) * radius,
      corner.y - ((corner.y - prev.y) / inLength) * radius,
    );
    const after = new Point(
      corner.x + ((next.x - corner.x) / outLength) * radius,
      corner.y + ((next.y - corner.y) / outLength) * radius,
    );
    path.push(`L${before.x} ${before.y}`, `Q${corner.x} ${corner.y} ${after.x} ${after.y}`);
  }
  const last = points.at(-1)!;
  path.push(`L${last.x} ${last.y}`);
  return path.join(' ');
};
