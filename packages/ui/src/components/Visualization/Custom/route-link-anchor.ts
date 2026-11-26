import { AbstractAnchor, AnchorEnd, Node, Point, useAnchor } from '@patternfly/react-topology';

import { CanvasDefaults } from '../Canvas/canvas.defaults';
import { LayoutType } from '../Canvas/canvas.models';
import type { AgentLinkData } from '../designer-canvas-model';
import { getIncomingTagLabels, getTagGroupSize } from './Edge/topology-tag-size';

/** The type of the edges from an agent route to its tools, the only edges that leave and reach routes by these anchors */
export const AI_TOOL_EDGE_TYPE = 'topology-edge';

/*
 * The links between routes leave a route on its far side and reach the next one on its near side.
 * How far inside the route box the links run from the agent steps to where they leave the route: under the step
 * names in a horizontal layout, past the names of the steps, which are wider than the steps, in a vertical one.
 */
export const ROUTE_LINK_BUS_INSET = { horizontal: 10, vertical: 5 };

/** The space between the links of the agent routes laid out side by side, so each one can be followed */
const ROUTE_LINK_SPACING = 8;
/** The room the links keep before the next rank, for their bends, their tags and their arrows */
const NEXT_RANK_CLEARANCE = 40;

const isHorizontalLayout = (node: Node): boolean =>
  (node.getGraph()?.getLayout?.() as LayoutType) === LayoutType.DagreHorizontal;

/** Where the links leave the route: the bottom right, past the last step, on the side the tools are on */
export const getRouteLinkExit = (route: Node): Point => {
  const bounds = route.getBounds();
  const isHorizontal = isHorizontalLayout(route);
  if (!route.isGroup() || route.isCollapsed()) {
    /* A collapsed route is drawn as a step, with its name under it */
    return isHorizontal
      ? new Point(bounds.right(), bounds.y + bounds.height / 2)
      : new Point(bounds.x + bounds.width / 2, bounds.bottom() + CanvasDefaults.DEFAULT_LABEL_HEIGHT);
  }
  return isHorizontal
    ? new Point(bounds.right(), bounds.bottom() - ROUTE_LINK_BUS_INSET.horizontal)
    : new Point(bounds.right() - ROUTE_LINK_BUS_INSET.vertical, bounds.bottom());
};

const getAgentLinks = (route: Node) =>
  route.getSourceEdges().filter((edge) => ((edge.getData() as AgentLinkData | undefined)?.sourceSteps.length ?? 0) > 0);

/** Where a route ends along the flow: its box, and the name under it when it is collapsed and drawn as a step */
const getFlowEnd = (route: Node, isHorizontal: boolean): number => {
  const bounds = route.getBounds();
  if (route.isGroup() && !route.isCollapsed()) {
    return isHorizontal ? bounds.right() : bounds.bottom();
  }
  return isHorizontal
    ? Math.max(bounds.right(), bounds.x + bounds.width / 2 + CanvasDefaults.DEFAULT_LABEL_WIDTH / 2)
    : bounds.bottom() + CanvasDefaults.DEFAULT_LABEL_HEIGHT;
};

/**
 * The room the tags beside the tools these routes link to take along the flow, which the layout leaves between the
 * ranks and the links keep clear of
 */
const getTagRoom = (routes: Node[], isHorizontal: boolean): number =>
  Math.max(
    0,
    ...routes.flatMap((route) =>
      getAgentLinks(route).map((edge) => {
        const { width, height } = getTagGroupSize(getIncomingTagLabels(edge.getTarget()).labels, !isHorizontal);
        return isHorizontal ? width : height;
      }),
    ),
  );

/**
 * Where the link to the tools starts: past the far side of every route laid out in the same rank as this one, so
 * the link bends where it crosses none of them, a little further for each agent route before this one in the rank,
 * as far as the room before the next rank allows, besides the room of the tags.
 */
export const getRouteLinkStart = (route: Node): Point => {
  const isHorizontal = isHorizontalLayout(route);
  const exit = getRouteLinkExit(route);
  const bounds = route.getBounds();
  const start = (node: Node) => (isHorizontal ? node.getBounds().x : node.getBounds().y);

  const routes = route.getGraph()?.getNodes() ?? [];
  const rank = routes.filter((node) => {
    const other = node.getBounds();
    return isHorizontal
      ? other.x < bounds.right() && other.right() > bounds.x
      : other.y < bounds.bottom() && other.bottom() > bounds.y;
  });
  const rankEnd = Math.max(...rank.map((node) => getFlowEnd(node, isHorizontal)), isHorizontal ? exit.x : exit.y);

  const agentRoutes = rank
    .filter((node) => getAgentLinks(node).length > 0)
    .sort((a, b) => (isHorizontal ? a.getBounds().y - b.getBounds().y : a.getBounds().x - b.getBounds().x));
  const nextRankStart = Math.min(...routes.map(start).filter((position) => position >= rankEnd));
  const room = Math.max(nextRankStart - rankEnd - NEXT_RANK_CLEARANCE - getTagRoom(agentRoutes, isHorizontal), 0);
  const spacing = agentRoutes.length > 1 ? Math.min(ROUTE_LINK_SPACING, room / (agentRoutes.length - 1)) : 0;
  const offset = Math.max(agentRoutes.indexOf(route), 0) * spacing;

  return isHorizontal ? new Point(rankEnd + offset, exit.y) : new Point(exit.x, rankEnd + offset);
};

class RouteLinkAnchor extends AbstractAnchor {
  constructor(
    owner: Node,
    private readonly end: AnchorEnd.source | AnchorEnd.target,
  ) {
    super(owner);
  }

  getLocation(): Point {
    return this.getReferencePoint();
  }

  getReferencePoint(): Point {
    if (this.end === AnchorEnd.source) {
      return getRouteLinkStart(this.owner);
    }
    const bounds = this.owner.getBounds();
    if (isHorizontalLayout(this.owner)) {
      return new Point(bounds.x, bounds.y + bounds.height / 2);
    }
    return new Point(bounds.x + bounds.width / 2, bounds.y);
  }
}

/**
 * Makes the links from an agent route to its tools leave the route on its far side and reach a tool route on its
 * near side. The other edges keep the anchors of the route.
 */
export const useRouteLinkAnchors = (): void => {
  useAnchor((node: Node) => new RouteLinkAnchor(node, AnchorEnd.source), AnchorEnd.source, AI_TOOL_EDGE_TYPE);
  useAnchor((node: Node) => new RouteLinkAnchor(node, AnchorEnd.target), AnchorEnd.target, AI_TOOL_EDGE_TYPE);
};
