import './ProjectToolbar.scss';

import { ContentSwitcher, Switch } from '@carbon/react';
import { FunctionComponent } from 'react';

import { useIntegrationHeader, ViewMode } from '../../context/IntegrationHeaderContext';
import { editorKindFor } from '../../pages/Project/editors/editor-registry';
import { getFileType } from '../../services/files/stored-file';
import { AppMenuDropdown } from './AppMenuDropdown/AppMenuDropdown';
import { SelectedRuntime } from './SelectedRuntime/SelectedRuntime';

const VIEW_MODES: ViewMode[] = ['design', 'code'];

export const ProjectToolbar: FunctionComponent = () => {
  const integrationHeader = useIntegrationHeader();

  // `current` is the name of the open file. A file that opens as text has no views to switch between: it shows as code.
  const isTextFile = !!integrationHeader?.current && editorKindFor(getFileType(integrationHeader.current)) === 'text';

  return (
    <div className="cs--project-toolbar" data-testid="project-toolbar">
      <div className="cs--project-toolbar__start">
        <AppMenuDropdown />
      </div>
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
        </ContentSwitcher>
      )}
      <div className="cs--project-toolbar__end">
        <SelectedRuntime />
      </div>
    </div>
  );
};
