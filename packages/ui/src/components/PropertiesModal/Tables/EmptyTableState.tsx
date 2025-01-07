import { Bullseye, EmptyState, EmptyStateVariant } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

interface IEmptyTableStateProps {
  name: string;
}

export const EmptyTableState: FunctionComponent<IEmptyTableStateProps> = (props) => {
  return (
    <Bullseye>
      <EmptyState  headingLevel="h2" icon={SearchIcon}  titleText={'No properties found for ' + props.name} variant={EmptyStateVariant.sm}>
        </EmptyState>
    </Bullseye>
  );
};
