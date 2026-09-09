import { useMemo } from 'react';
import { Navigate, Outlet } from 'react-router';

import { Explorer } from '../components/Explorer/Explorer';
import { ProjectToolbar } from '../components/ProjectToolbar/ProjectToolbar';
import { ProjectContext } from '../context/ProjectContext';
import { RuntimeProvider } from '../context/RuntimeProvider';
import { useSafeParams } from '../hooks/useSafeParams';

const ProjectLayoutInner = () => (
  <div className="cs--project-layout">
    <ProjectToolbar />
    <div className="cs--project-layout__body">
      <Explorer />
      <div className="cs--project-layout__outlet">
        <Outlet />
      </div>
    </div>
  </div>
);

export const ProjectLayout = () => {
  const params = useSafeParams(['projectId']);
  const ctx = useMemo(() => (params ? { projectId: params.projectId } : null), [params]);

  if (!ctx) return <Navigate to="/" replace />;

  return (
    <ProjectContext.Provider value={ctx}>
      <RuntimeProvider catalogUrl="" runtimeCatalogName="" testingCatalogName="">
        <ProjectLayoutInner />
      </RuntimeProvider>
    </ProjectContext.Provider>
  );
};
