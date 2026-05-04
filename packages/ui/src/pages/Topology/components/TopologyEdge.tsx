import {
  ConnectorArrow,
  EdgeModel,
  getClosestVisibleParent,
  GraphElement,
  isEdge,
  observer,
} from '@patternfly/react-topology';
import { FunctionComponent } from 'react';

import { buildRoundedPath } from '../rounded-path';

interface TopologyEdgeProps {
  element: GraphElement<EdgeModel, unknown>;
}

const CORNER_RADIUS = 12;

/**
 * Edge renderer that draws the path defined by start + bendpoints + end with
 * rounded corners. Bendpoints are produced by the edge element factory
 * (see OrthogonalBendpointsEdge), this component only handles the rendering.
 */
export const TopologyEdge: FunctionComponent<TopologyEdgeProps> = observer(({ element }) => {
  if (!isEdge(element)) {
    throw new Error('TopologyEdge must be used only on Edge elements');
  }

  // Hide edges between nodes that are inside a collapsed group (route children).
  const sourceParent = getClosestVisibleParent(element.getSource());
  const targetParent = getClosestVisibleParent(element.getTarget());
  if (sourceParent?.isCollapsed() && sourceParent === targetParent) {
    return null;
  }

  const startPoint = element.getStartPoint();
  const endPoint = element.getEndPoint();
  const bendpoints = element.getBendpoints();
  const points = [startPoint, ...bendpoints, endPoint];
  const d = buildRoundedPath(points, CORNER_RADIUS);

  // The arrow direction must match the last segment so it points along the
  // approach to the target node.
  const arrowStart = bendpoints.length > 0 ? bendpoints[bendpoints.length - 1] : startPoint;

  return (
    <g className="custom-edge topology-edge">
      <path className="custom-edge__background" d={d} />
      <path className="custom-edge__body" d={d} />
      <ConnectorArrow isTarget className="custom-edge__connector" startPoint={arrowStart} endPoint={endPoint} />
    </g>
  );
});
