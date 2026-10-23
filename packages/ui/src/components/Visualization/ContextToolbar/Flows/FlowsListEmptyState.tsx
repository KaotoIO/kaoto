import { Flow } from '@carbon/icons-react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

export const FlowsListEmptyState: FunctionComponent = () => {
  return (
    <EmptyState headingLevel="h4" icon={Flow} titleText="There's no routes to show" data-testid="empty-state">
      <EmptyStateBody>You could create a new route using the New route button</EmptyStateBody>
    </EmptyState>
  );
};
