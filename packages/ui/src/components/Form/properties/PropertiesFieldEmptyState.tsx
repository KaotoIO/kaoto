import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { AddPropertyButtons } from './AddPropertyButtons';

interface IPropertiesFieldEmptyState {
  name: string;
  disabled: boolean;
  createPlaceholder: (isObject: boolean) => void;
}

export const PropertiesFieldEmptyState: FunctionComponent<IPropertiesFieldEmptyState> = ({
  name,
  disabled,
  createPlaceholder,
}) => {
  return (
    <EmptyState>
      <EmptyStateBody>No {name}</EmptyStateBody>
      <AddPropertyButtons showLabel path={[]} disabled={disabled} createPlaceholder={createPlaceholder} />
    </EmptyState>
  );
};
