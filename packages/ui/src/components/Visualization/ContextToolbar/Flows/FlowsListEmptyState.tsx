import { EmptyState, EmptyStateBody,  } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

export const FlowsListEmptyState: FunctionComponent = () => {
  return (
    <EmptyState  headingLevel="h4" icon={CubesIcon}  titleText="There's no routes to show" data-testid="empty-state">
      <EmptyStateBody>You could create a new route using the New route button</EmptyStateBody>
    </EmptyState>
  );
};
