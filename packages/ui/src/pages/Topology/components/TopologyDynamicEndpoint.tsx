import { BoltIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { TopologySyntheticEndpoint, TopologySyntheticEndpointProps } from './TopologySyntheticEndpoint';

interface TopologyDynamicEndpointProps {
  element: TopologySyntheticEndpointProps['element'];
}

/**
 * Renders an endpoint whose URI contains a Camel expression like
 * `${header.foo}` that can't be resolved at design time. Uses the same
 * BoltIcon badge that the Design view's `toD` step shows.
 */
export const TopologyDynamicEndpoint: FunctionComponent<TopologyDynamicEndpointProps> = ({ element }) => (
  <TopologySyntheticEndpoint
    element={element}
    className="topology-dynamic-endpoint"
    testIdPrefix="topology-dynamic"
    titlePrefix="Dynamic endpoint"
    BadgeIcon={BoltIcon}
  />
);
