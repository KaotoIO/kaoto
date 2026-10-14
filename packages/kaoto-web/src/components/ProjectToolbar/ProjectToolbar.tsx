import './ProjectToolbar.scss';

import { Redo, Undo } from '@carbon/icons-react';
import { ContentSwitcher, IconButton, Switch } from '@carbon/react';
import { FunctionComponent } from 'react';

import { useIntegrationHeader, ViewMode } from '../../context/IntegrationHeaderContext';
import { useProjectContext } from '../../hooks/useProjectContext';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { AppMenuDropdown } from './AppMenuDropdown/AppMenuDropdown';
import { SelectedRuntime } from './SelectedRuntime/SelectedRuntime';

export const ProjectToolbar: FunctionComponent = () => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { projectId } = useProjectContext();
  const integrationHeader = useIntegrationHeader();

  const isIntegrationActive = !!integrationHeader?.current;

  return (
    <div className="cs--project-toolbar" data-testid="project-toolbar">
      <AppMenuDropdown projectId={projectId} />
      <div className="cs--project-toolbar__controls">
        <IconButton label="Undo" disabled={!canUndo} onClick={undo} kind="ghost" size="sm">
          <Undo />
        </IconButton>
        <IconButton label="Redo" disabled={!canRedo} onClick={redo} kind="ghost" size="sm">
          <Redo />
        </IconButton>
      </div>
      <SelectedRuntime />
      {isIntegrationActive && (
        <ContentSwitcher
          size="sm"
          className="cs--project-toolbar__switcher"
          selectedIndex={['design', 'code', 'topology'].indexOf(integrationHeader.viewMode)}
          onChange={({ name }) => {
            integrationHeader.setViewMode(name as ViewMode);
          }}
          data-testid="integration-shell-switcher"
        >
          <Switch name="design" text="Design" data-testid="view-mode-design" />
          <Switch name="code" text="Code" data-testid="view-mode-code" />
          <Switch name="topology" text="Topology" data-testid="view-mode-topology" />
        </ContentSwitcher>
      )}
    </div>
  );
};
