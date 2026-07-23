import { ActionList, ActionListItem, Button } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

type VariablesHeaderProps = {
  isReadOnly: boolean;
  onAddVariable: () => void;
};

export const VariablesHeader: FunctionComponent<VariablesHeaderProps> = ({ isReadOnly, onAddVariable }) => (
  <div className="parameters-header" data-testid="source-variables-header">
    <span className="parameters-header__title panel-header-text">Variables</span>
    <ActionList isIconList className="parameters-header__actions">
      {!isReadOnly && (
        <ActionListItem>
          <Button
            icon={<PlusIcon />}
            variant="plain"
            title="Add variable"
            aria-label="Add variable"
            data-testid="add-variable-button"
            onClick={(e) => {
              e.stopPropagation();
              onAddVariable();
            }}
          />
        </ActionListItem>
      )}
    </ActionList>
  </div>
);
