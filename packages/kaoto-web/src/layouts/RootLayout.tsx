import { Content } from '@carbon/react';
import { Suspense } from 'react';
import { Outlet } from 'react-router';

import { LoadingState } from '../components/LoadingState/LoadingState';
import { Nav } from '../components/Nav/Nav';

export const RootLayout = () => {
  return (
    <div className="cs--page-layout">
      <Nav />
      <Content id="main-content" className="cs--content">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </Content>
    </div>
  );
};
