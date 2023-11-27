import { EmptyState, EmptyStateBody, EmptyStateHeader, EmptyStateIcon } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

export const FlowsListEmptyState: FunctionComponent = () => {
  return (
    <EmptyState data-testid="empty-state">
      <EmptyStateHeader
        titleText="There's no routes to show"
        icon={<EmptyStateIcon icon={CubesIcon} />}
        headingLevel="h4"
      />
      <EmptyStateBody>You could create a new route using the New route button</EmptyStateBody>
    </EmptyState>
  );
};
