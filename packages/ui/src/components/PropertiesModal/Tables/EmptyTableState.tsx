import { Search } from '@carbon/icons-react';
import { Bullseye, EmptyState, EmptyStateVariant } from '@patternfly/react-core';
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
        icon={Search}
        titleText={'No properties found for ' + props.name}
        variant={EmptyStateVariant.sm}
      />
    </Bullseye>
  );
};
