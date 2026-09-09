import './ProjectToolbar.scss';

import { Redo, Undo } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent } from 'react';

import { useProjectContext } from '../../hooks/useProjectContext';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { AppMenuDropdown } from './AppMenuDropdown/AppMenuDropdown';
import { SelectedRuntime } from './SelectedRuntime/SelectedRuntime';

export const ProjectToolbar: FunctionComponent = () => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { projectId } = useProjectContext();

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
    </div>
  );
};
