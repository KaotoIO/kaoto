import { Bullseye, EmptyState, EmptyStateHeader, EmptyStateIcon, EmptyStateVariant } from '@patternfly/react-core';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
import { FunctionComponent } from 'react';

interface IEmptyTableStateProps {
  componentName: string;
}

export const EmptyTableState: FunctionComponent<IEmptyTableStateProps> = (props) => {
  return (
    <tr>
      <td colSpan={8}>
        <Bullseye>
          <EmptyState variant={EmptyStateVariant.sm}>
            <EmptyStateHeader
              icon={<EmptyStateIcon icon={SearchIcon} />}
              titleText={'No properties found for ' + props.componentName}
              headingLevel="h2"
            />
          </EmptyState>
        </Bullseye>
      </td>
    </tr>
  );
};
