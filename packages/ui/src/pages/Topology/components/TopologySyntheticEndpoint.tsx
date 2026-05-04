import { ElementModel, GraphElement, isNode, observer } from '@patternfly/react-topology';
import { ComponentType, FunctionComponent } from 'react';

import { CanvasDefaults } from '../../../components/Visualization/Canvas/canvas.defaults';
import { CanvasNode } from '../../../components/Visualization/Canvas/canvas.models';
import { FloatingCircle } from '../../../components/Visualization/Custom/FloatingCircle/FloatingCircle';
import { TopologyNodeLabel } from './TopologyNodeLabel';

export type SyntheticEndpointData = CanvasNode['data'] & { iconUrl?: string };

export interface TopologySyntheticEndpointProps {
  element: GraphElement<ElementModel, SyntheticEndpointData>;
  /** Extra class added on the outer `<g>`; also used as prefix for the badge class. */
  className: string;
  /** Used to build `data-testid` on the outer `<g>`. */
  testIdPrefix: string;
  /** Tooltip prefix shown on hover ("<prefix>: <label>"). */
  titlePrefix: string;
  /** Icon rendered in the FloatingCircle badge above the node. */
  BadgeIcon: ComponentType;
}

/**
 * Renderer for synthetic endpoint nodes (external and dynamic). Visually
 * identical to a collapsed route node — same container, same route icon and
 * label position — but read-only: no double-click, no context menu, no
 * pointer interactions. The badge in the top-right corner indicates the kind
 * of synthetic endpoint.
 */
export const TopologySyntheticEndpoint: FunctionComponent<TopologySyntheticEndpointProps> = observer(
  ({ element, className, testIdPrefix, titlePrefix, BadgeIcon }) => {
    if (!isNode(element)) {
      throw new Error('TopologySyntheticEndpoint must be used only on Node elements');
    }

    const label = element.getLabel?.() ?? '';
    const iconUrl = element.getData?.()?.iconUrl ?? '';
    const bounds = element.getBounds?.();
    const width = bounds?.width ?? CanvasDefaults.DEFAULT_NODE_WIDTH;
    const height = bounds?.height ?? CanvasDefaults.DEFAULT_NODE_HEIGHT;

    return (
      <g className={`custom-node ${className}`} data-testid={`${testIdPrefix}__${label}`} data-label={label}>
        <foreignObject width={width} height={height}>
          <div className="custom-node__container" title={`${titlePrefix}: ${label}`}>
            <div className="custom-node__container__image">
              {iconUrl && <img src={iconUrl} alt={label} />}
              <FloatingCircle className={`step-icon ${className}__badge`}>
                <BadgeIcon />
              </FloatingCircle>
            </div>
          </div>
        </foreignObject>
        <TopologyNodeLabel label={label} nodeWidth={width} nodeHeight={height} />
      </g>
    );
  },
);
