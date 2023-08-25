import { Bullseye, EmptyState, EmptyStateHeader, EmptyStateIcon, EmptyStateVariant } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

interface IEmptyTableStateProps {
  componentName: string;
}

export const EmptyTableState: FunctionComponent<IEmptyTableStateProps> = (props) => {
  return (
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.sm}>
            <EmptyStateHeader
              data-testid={'empty-state'}
              icon={<EmptyStateIcon icon={SearchIcon} />}
              titleText={'No properties found for ' + props.componentName}
              headingLevel="h2"
            />
          </EmptyState>
        </Bullseye>
  );
};
