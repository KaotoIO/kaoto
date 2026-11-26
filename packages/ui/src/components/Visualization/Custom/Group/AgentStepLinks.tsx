import './AgentStepLinks.scss';

import {
  DEFAULT_LAYER,
  getClosestVisibleParent,
  isNode,
  Layer,
  Node,
  observer,
  Point,
  useDndManager,
} from '@patternfly/react-topology';
import { FunctionComponent } from 'react';

import { LayoutType } from '../../Canvas/canvas.models';
import type { AgentLinkData } from '../../designer-canvas-model';
import { getRouteLinkExit, getRouteLinkStart } from '../route-link-anchor';
import { getAgentStepLinkPoints, getAgentStepPort, roundedPath } from './agent-step-link-path';

const PORT_RADIUS = 3;

/**
 * Inside an agent route, the links to the tools start from the agent steps and leave the route together.
 * A step inside a collapsed container starts its link from the container, and a collapsed route from its side.
 * The links are hidden while a step is dragged, as the steps they start from are drawn where they were.
 */
export const AgentStepLinks: FunctionComponent<{ element: Node }> = observer(({ element }) => {
  const dndManager = useDndManager();
  const stepIds = new Set<string>(
    element.getSourceEdges().flatMap((edge) => (edge.getData() as AgentLinkData | undefined)?.sourceSteps ?? []),
  );
  if (stepIds.size === 0 || dndManager.isDragging()) return null;

  const controller = element.getController();
  const isHorizontal = element.getGraph().getLayout() === LayoutType.DagreHorizontal;

  /* The nodes the links start from, once each: the steps, or the collapsed containers or route that hold them */
  const starts = new Map<string, Node>();
  stepIds.forEach((stepId) => {
    const step = controller.getNodeById(stepId);
    if (!step) return;
    const visible = step.isVisible() ? step : getClosestVisibleParent(step);
    if (visible && isNode(visible)) starts.set(visible.getId(), visible);
  });

  const links = [...starts.values()].map((start) => {
    const isRoute = start === element;
    const port = isRoute ? getRouteLinkExit(element) : getAgentStepPort(start, isHorizontal);
    const points: Point[] = isRoute
      ? [port, getRouteLinkStart(element)]
      : getAgentStepLinkPoints(start, element, isHorizontal);
    return (
      <g key={start.getId()} className="agent-step-link" data-testid="agent-step-link">
        <circle className="agent-step-link__port" cx={port.x} cy={port.y} r={PORT_RADIUS} />
        {/* Drawn from where the link leaves, so the dashes of the links that share a stretch line up */}
        <path className="agent-step-link__body" d={roundedPath([...points].reverse())} />
      </g>
    );
  });

  /* The layer draws the content of a collapsed route from where the route is, and the links are in canvas coordinates */
  const origin = element.isCollapsed() ? element.getPosition() : new Point(0, 0);

  return (
    <Layer id={DEFAULT_LAYER}>
      <g transform={`translate(${-origin.x}, ${-origin.y})`}>{links}</g>
    </Layer>
  );
});
