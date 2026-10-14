import { Content } from '@carbon/react';
import { Suspense, useMemo, useState } from 'react';
import { Outlet } from 'react-router';

import { BreadcrumbLink } from '../components/Breadcrumbs/Breadcrumbs';
import { LoadingState } from '../components/LoadingState/LoadingState';
import { Nav } from '../components/Nav/Nav';
import { IntegrationHeaderContext, ViewMode } from '../context/IntegrationHeaderContext';

export const RootLayout = () => {
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbLink[]>([]);
  const [current, setCurrent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('design');

  const ctxValue = useMemo(
    () => ({ breadcrumbItems, current, viewMode, setViewMode, setBreadcrumbItems, setCurrent }),
    // setViewMode / setBreadcrumbItems / setCurrent are stable (useState setters never change identity)
    [breadcrumbItems, current, viewMode],
  );

  return (
    <IntegrationHeaderContext.Provider value={ctxValue}>
      <div className="cs--page-layout">
        <Nav />
        <Content id="main-content" className="cs--content">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </Content>
      </div>
    </IntegrationHeaderContext.Provider>
  );
};
