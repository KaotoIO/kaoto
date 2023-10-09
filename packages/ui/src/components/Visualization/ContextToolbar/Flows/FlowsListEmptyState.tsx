import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

export const FlowsListEmptyState: FunctionComponent = () => {
  return (
    <EmptyState data-testid="empty-state">
      <EmptyStateIcon icon={CubesIcon} />
      <Title headingLevel="h4" size="md">
        There's no routes to show
      </Title>
      <EmptyStateBody>You could create a new route using the New route button</EmptyStateBody>
    </EmptyState>
  );
};
