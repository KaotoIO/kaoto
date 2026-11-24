import './EditorHeader.scss';

import { CarbonIconType, Redo, Undo } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent } from 'react';

import { useUndoRedo } from '../../../hooks/useUndoRedo';

interface EditorHeaderProps {
  /** Icon of what the editor shows, e.g. the code or the flow */
  icon: CarbonIconType;
  /** Path of the open file; the header shows its name */
  path: string;
}

const fileNameOf = (path: string): string => path.split('/').pop() ?? path;

/**
 * Header bar above the open file, styled like the one of the Explorer: an icon and the name of the file, and undo and
 * redo on the right
 */
export const EditorHeader: FunctionComponent<EditorHeaderProps> = ({ icon: Icon, path }) => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  return (
    <div className="cs--editor-header">
      <Icon className="cs--editor-header__icon" aria-hidden="true" />
      <h2 className="cs--editor-header__title">{fileNameOf(path)}</h2>
      <div className="cs--editor-header__actions">
        <IconButton label="Undo" disabled={!canUndo} onClick={undo} kind="ghost" size="sm">
          <Undo />
        </IconButton>
        <IconButton label="Redo" disabled={!canRedo} onClick={redo} kind="ghost" size="sm" align="bottom-end">
          <Redo />
        </IconButton>
      </div>
    </div>
  );
};
