import { Bullseye, EmptyState, EmptyStateVariant } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

interface IEmptyTableStateProps {
  name: string;
}

export const EmptyTableState: FunctionComponent<IEmptyTableStateProps> = (props) => {
  return (
    <Bullseye>
      <EmptyState
        data-testid="empty-state"
        headingLevel="h2"
        icon={SearchIcon}
        titleText={'No properties found for ' + props.name}
        variant={EmptyStateVariant.sm}
      />
    </Bullseye>
  );
};
