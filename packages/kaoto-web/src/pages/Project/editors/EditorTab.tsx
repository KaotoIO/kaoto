import './EditorTab.scss';

import { CarbonIconType, Close } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent } from 'react';

interface EditorTabProps {
  /** Icon of what the editor shows, e.g. the code or the flow */
  icon: CarbonIconType;
  /** Path of the open file; the tab shows its name and the full path on hover */
  path: string;
  /** Called when the close button of the tab is clicked */
  onClose: () => void;
}

/** The last segment of the path */
const fileNameOf = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

/**
 * The tab of the open file in the editor header: the icon of the view and the name of the file, with the full path on
 * hover, followed by a button that closes the file
 */
export const EditorTab: FunctionComponent<EditorTabProps> = ({ icon: Icon, path, onClose }) => {
  const name = fileNameOf(path);

  return (
    <div className="cs--editor-tab">
      <div role="tab" aria-selected="true" title={path} className="cs--editor-tab__label">
        <Icon className="cs--editor-tab__icon" aria-hidden="true" />
        <span className="cs--editor-tab__name">{name}</span>
      </div>
      <IconButton label={`Close ${name}`} kind="ghost" size="sm" onClick={onClose}>
        <Close />
      </IconButton>
    </div>
  );
};
