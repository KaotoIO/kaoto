import './ProjectToolbar.scss';

import { Redo, Undo } from '@carbon/icons-react';
import { ContentSwitcher, IconButton, Switch } from '@carbon/react';
import { FunctionComponent } from 'react';

import { useIntegrationHeader, ViewMode } from '../../context/IntegrationHeaderContext';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { editorKindFor } from '../../pages/Project/editors/editor-registry';
import { getFileType } from '../../services/files/stored-file';
import { AppMenuDropdown } from './AppMenuDropdown/AppMenuDropdown';
import { SelectedRuntime } from './SelectedRuntime/SelectedRuntime';

const VIEW_MODES: ViewMode[] = ['design', 'code', 'topology'];

export const ProjectToolbar: FunctionComponent = () => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const integrationHeader = useIntegrationHeader();

  // `current` is the name of the open file. A file that opens as text has no views to switch between: it shows as code.
  const isTextFile = !!integrationHeader?.current && editorKindFor(getFileType(integrationHeader.current)) === 'text';

  return (
    <div className="cs--project-toolbar" data-testid="project-toolbar">
      <AppMenuDropdown />
      <div className="cs--project-toolbar__controls">
        <IconButton label="Undo" disabled={!canUndo} onClick={undo} kind="ghost" size="sm">
          <Undo />
        </IconButton>
        <IconButton label="Redo" disabled={!canRedo} onClick={redo} kind="ghost" size="sm">
          <Redo />
        </IconButton>
      </div>
      <SelectedRuntime />
      {integrationHeader && integrationHeader.current !== '' && (
        <ContentSwitcher
          size="sm"
          className="cs--project-toolbar__switcher"
          selectedIndex={VIEW_MODES.indexOf(isTextFile ? 'code' : integrationHeader.viewMode)}
          onChange={({ name }) => {
            integrationHeader.setViewMode(name as ViewMode);
          }}
          data-testid="integration-shell-switcher"
        >
          <Switch name="design" text="Design" disabled={isTextFile} data-testid="view-mode-design" />
          <Switch name="code" text="Code" disabled={isTextFile} data-testid="view-mode-code" />
          <Switch name="topology" text="Topology" disabled={isTextFile} data-testid="view-mode-topology" />
        </ContentSwitcher>
      )}
    </div>
  );
};
