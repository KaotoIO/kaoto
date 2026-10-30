import { ActionList, ActionListItem, Button, Icon, Label } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { PARAMETERS_SECTION_ANCHOR } from '../../../models/datamapper/connection-port';

type ParametersHeaderProps = {
  isReadOnly: boolean;
  onAddParameter: () => void;
  showParameters: boolean;
  onToggleParameters: () => void;
};

/**
 * ParametersHeader - Simple header for the Parameters section
 * Shows "Parameters" title + Add/Eye buttons (when not readonly)
 */
export const ParametersHeader: FunctionComponent<ParametersHeaderProps> = ({
  isReadOnly,
  onAddParameter,
  showParameters,
  onToggleParameters,
}) => (
  <div className="parameters-header" data-testid="source-parameters-header">
    <span
      className="node__connection-port node__connection-port--source"
      data-testid="connection-port-parameters-header"
      data-connection-port="true"
      data-node-path={PARAMETERS_SECTION_ANCHOR.nodePath}
      data-document-node-id={PARAMETERS_SECTION_ANCHOR.documentNodeId}
    />
    <span className="parameters-header__title panel-header-text">
      <Label>Source</Label> Parameters
    </span>
    <ActionList isIconList className="parameters-header__actions">
      {!isReadOnly && (
        <ActionListItem>
          <Button
            icon={<PlusIcon />}
            variant="plain"
            title="Add parameter"
            aria-label="Add parameter"
            data-testid="add-parameter-button"
            onClick={(e) => {
              e.stopPropagation();
              onAddParameter();
            }}
          />
        </ActionListItem>
      )}
      <ActionListItem>
        <Button
          variant="plain"
          title={showParameters ? 'Hide all parameters' : 'Show all parameters'}
          aria-label={showParameters ? 'Hide all parameters' : 'Show all parameters'}
          data-testid="toggle-parameters-button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleParameters();
          }}
          icon={<Icon isInline>{showParameters ? <EyeIcon /> : <EyeSlashIcon />}</Icon>}
        />
      </ActionListItem>
    </ActionList>
  </div>
);
