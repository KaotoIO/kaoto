import { Outlet } from 'react-router';

import { Explorer } from '../components/Explorer/Explorer';
import { ProjectToolbar } from '../components/ProjectToolbar/ProjectToolbar';
import { FilesProvider } from '../context/FilesContext';
import { RuntimeProvider } from '../context/RuntimeProvider';

export const ProjectLayout = () => (
  <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
    <FilesProvider>
      <div className="cs--project-layout">
        <ProjectToolbar />
        <div className="cs--project-layout__body">
          <Explorer />
          <div className="cs--project-layout__outlet">
            <Outlet />
          </div>
        </div>
      </div>
    </FilesProvider>
  </RuntimeProvider>
);
