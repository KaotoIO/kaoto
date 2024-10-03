import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { AddPropertyButtons } from './AddPropertyButtons';

interface IPropertiesFieldEmptyState {
  name: string;
  disabled: boolean;
  canAddObjectProperties: boolean;
  createPlaceholder: (isObject: boolean) => void;
}

export const PropertiesFieldEmptyState: FunctionComponent<IPropertiesFieldEmptyState> = ({
  name,
  disabled,
  canAddObjectProperties,
  createPlaceholder,
}) => {
  return (
    <EmptyState>
      <EmptyStateBody>No {name}</EmptyStateBody>
      <AddPropertyButtons
        showLabel
        path={[]}
        disabled={disabled}
        canAddObjectProperties={canAddObjectProperties}
        createPlaceholder={createPlaceholder}
      />
    </EmptyState>
  );
};
