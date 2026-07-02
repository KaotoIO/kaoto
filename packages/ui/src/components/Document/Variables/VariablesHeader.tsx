import { FunctionComponent } from 'react';

type VariablesHeaderProps = {
  isReadOnly: boolean;
};

export const VariablesHeader: FunctionComponent<VariablesHeaderProps> = () => (
  <div className="parameters-header" data-testid="source-variables-header">
    <span className="parameters-header__title panel-header-text">Variables</span>
    {/* TODO(#3340): Enable "Add Variable" button when global variable support is implemented.
        Context menu "Add Variable" on target nodes is also disabled (mapping-action.service.ts). */}
  </div>
);
