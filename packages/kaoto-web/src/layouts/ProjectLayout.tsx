import { Outlet } from 'react-router';

import { Explorer } from '../components/Explorer/Explorer';
import { useExplorerWidth } from '../components/Explorer/useExplorerWidth';
import { ProjectToolbar } from '../components/ProjectToolbar/ProjectToolbar';
import { RuntimeProvider } from '../context/RuntimeProvider';
import { indexedDbStorage } from '../services/files/indexed-db-storage';
import { FilesUiStoreProvider } from '../store/files/FilesUiStoreProvider';

export const ProjectLayout = () => {
  // The layout carries the width of the Explorer as a CSS variable: the Explorer takes it as its width, and the
  // toolbar centers the view switcher over the editor, which starts after the Explorer
  const { widthVariableElementRef, handleResizerMouseDown } = useExplorerWidth();

  return (
    <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
      <FilesUiStoreProvider storage={indexedDbStorage}>
        <div className="cs--project-layout" data-testid="project-layout" ref={widthVariableElementRef}>
          <ProjectToolbar />
          <div className="cs--project-layout__body">
            <Explorer onResizerMouseDown={handleResizerMouseDown} />
            <div className="cs--project-layout__outlet">
              <Outlet />
            </div>
          </div>
        </div>
      </FilesUiStoreProvider>
    </RuntimeProvider>
  );
};
