import './EditorHeader.scss';

import { CarbonIconType, Redo, Undo } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent } from 'react';

import { useUndoRedo } from '../../../hooks/useUndoRedo';
import { CopyFileButton } from './CopyFileButton';
import { EditorTab } from './EditorTab';

interface EditorHeaderProps {
  /** Icon of what the editor shows, e.g. the code or the flow */
  icon: CarbonIconType;
  /** Path of the open file; the header shows it as a tab */
  path: string;
  /** Content of the open file, which the header copies to the clipboard */
  content: string;
  /** Called when the tab of the open file is closed */
  onClose: () => void;
}

/**
 * Header bar above the open file, styled like the one of the Explorer: the list of open files on the left, for now only
 * the tab of the open file, and on the right undo and redo followed by the tools for the file (copy to the clipboard),
 * as in the toolbar of the Kaoto editor
 */
export const EditorHeader: FunctionComponent<EditorHeaderProps> = ({ icon, path, content, onClose }) => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  return (
    <div className="cs--editor-header">
      <div role="tablist" aria-label="Open files" className="cs--editor-header__tabs">
        <EditorTab icon={icon} path={path} onClose={onClose} />
      </div>
      <div className="cs--editor-header__actions">
        <div className="cs--editor-header__group">
          <IconButton label="Undo" disabled={!canUndo} onClick={undo} kind="ghost" size="sm">
            <Undo />
          </IconButton>
          <IconButton label="Redo" disabled={!canRedo} onClick={redo} kind="ghost" size="sm">
            <Redo />
          </IconButton>
        </div>
        <div className="cs--editor-header__group">
          <CopyFileButton content={content} />
        </div>
      </div>
    </div>
  );
};
