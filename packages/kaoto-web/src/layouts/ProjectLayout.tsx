import { CSSProperties } from 'react';
import { Outlet } from 'react-router';

import { Explorer } from '../components/Explorer/Explorer';
import { useExplorerWidth } from '../components/Explorer/useExplorerWidth';
import { ProjectToolbar } from '../components/ProjectToolbar/ProjectToolbar';
import { FilesProvider } from '../context/FilesContext';
import { RuntimeProvider } from '../context/RuntimeProvider';

export const ProjectLayout = () => {
  const { width: explorerWidth, handleResizerMouseDown } = useExplorerWidth();
  // The toolbar centers the view switcher over the editor, which starts after the Explorer
  const layoutStyle = { '--cs-explorer-inline-size': `${explorerWidth}px` } as CSSProperties;

  return (
    <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
      <FilesProvider>
        <div className="cs--project-layout" data-testid="project-layout" style={layoutStyle}>
          <ProjectToolbar />
          <div className="cs--project-layout__body">
            <Explorer width={explorerWidth} onResizerMouseDown={handleResizerMouseDown} />
            <div className="cs--project-layout__outlet">
              <Outlet />
            </div>
          </div>
        </div>
      </FilesProvider>
    </RuntimeProvider>
  );
};
