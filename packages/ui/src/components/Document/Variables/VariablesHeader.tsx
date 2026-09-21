import { ActionList, ActionListItem, Button, Divider, Icon, Label } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, isValidElement } from 'react';

import { VARIABLES_SECTION_ANCHOR } from '../../../models/datamapper/connection-port';

type VariablesHeaderProps = {
  isReadOnly: boolean;
  onAddVariable: () => void;
  showVariables: boolean;
  onToggleVariables: () => void;
  actionItems?: React.ReactNode[];
};

export const VariablesHeader: FunctionComponent<VariablesHeaderProps> = ({
  isReadOnly,
  onAddVariable,
  showVariables,
  onToggleVariables,
  actionItems,
}) => (
  <div className="parameters-header" data-testid="source-variables-header">
    <span
      className="node__connection-port node__connection-port--source"
      data-testid="connection-port-variables-header"
      data-connection-port="true"
      data-node-path={VARIABLES_SECTION_ANCHOR.nodePath}
      data-document-node-id={VARIABLES_SECTION_ANCHOR.documentNodeId}
    />
    <span className="parameters-header__title panel-header-text">
      <Label>Source</Label> Variables
    </span>
    <ActionList isIconList className="parameters-header__actions">
      {!isReadOnly && (
        <>
          <ActionListItem>
            <Button
              icon={<PlusIcon />}
              variant="plain"
              title="Add global variable"
              aria-label="Add global variable"
              data-testid="add-variable-button"
              onClick={(e) => {
                e.stopPropagation();
                onAddVariable();
              }}
            />
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="plain"
              title={showVariables ? 'Hide all variables' : 'Show all variables'}
              aria-label={showVariables ? 'Hide all variables' : 'Show all variables'}
              data-testid="toggle-variables-button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVariables();
              }}
              icon={<Icon isInline>{showVariables ? <EyeIcon /> : <EyeSlashIcon />}</Icon>}
            />
          </ActionListItem>
          <Divider orientation={{ default: 'vertical' }} />
        </>
      )}
      {actionItems?.map((item) => (
        <ActionListItem key={isValidElement(item) ? item.key : undefined}>{item}</ActionListItem>
      ))}
    </ActionList>
  </div>
);
