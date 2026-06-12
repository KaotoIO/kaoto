import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { TopologySyntheticEndpoint, TopologySyntheticEndpointProps } from './TopologySyntheticEndpoint';

interface TopologyExternalEndpointProps {
  element: TopologySyntheticEndpointProps['element'];
}

/**
 * Renders an endpoint that is referenced by a route in this file but isn't
 * defined here — typically a `direct:`/`seda:` target that lives in another
 * file or module.
 */
export const TopologyExternalEndpoint: FunctionComponent<TopologyExternalEndpointProps> = ({ element }) => (
  <TopologySyntheticEndpoint
    element={element}
    className="topology-external-endpoint"
    testIdPrefix="topology-external"
    titlePrefix="External endpoint"
    BadgeIcon={ExternalLinkAltIcon}
  />
);
