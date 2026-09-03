import { Route, Routes } from 'react-router';

import { RootLayout } from '../layouts/RootLayout';
import { RouteConfig } from '../types/routes';
import { routes } from './config';

const renderRoute = (route: RouteConfig) => {
  if (route.index) {
    return <Route key="index" index element={route.element && <route.element />} />;
  }
  return (
    <Route key={route.path} path={route.path} element={route.element && <route.element />}>
      {'children' in route && route.children?.map(renderRoute)}
    </Route>
  );
};

export const Router = () => (
  <Routes>
    <Route element={<RootLayout />}>{routes.map(renderRoute)}</Route>
  </Routes>
);
