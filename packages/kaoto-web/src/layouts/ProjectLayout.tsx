import { Navigate, Outlet } from 'react-router';

import { Explorer } from '../components/Explorer/Explorer';
import { ProjectBanner } from '../components/ProjectBanner/ProjectBanner';
import { useSafeParams } from '../hooks/useSafeParams';

export const ProjectLayout = () => {
  const params = useSafeParams(['projectId']);
  if (!params) return <Navigate to="/" replace />;

  return (
    <div className="cs--project-layout">
      <ProjectBanner />
      <div className="cs--project-layout__body">
        <Explorer />
        <div className="cs--project-layout__outlet">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
