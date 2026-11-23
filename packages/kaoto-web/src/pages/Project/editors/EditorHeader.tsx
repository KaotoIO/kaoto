import './EditorHeader.scss';

import { CarbonIconType } from '@carbon/icons-react';
import { FunctionComponent } from 'react';

interface EditorHeaderProps {
  /** Icon of what the editor shows, e.g. the code or the flow */
  icon: CarbonIconType;
  /** Path of the open file; the header shows its name */
  path: string;
}

const fileNameOf = (path: string): string => path.split('/').pop() ?? path;

/** Header bar above the open file, styled like the one of the Explorer: an icon and the name of the file */
export const EditorHeader: FunctionComponent<EditorHeaderProps> = ({ icon: Icon, path }) => (
  <div className="cs--editor-header">
    <Icon className="cs--editor-header__icon" aria-hidden="true" />
    <h2 className="cs--editor-header__title">{fileNameOf(path)}</h2>
  </div>
);
