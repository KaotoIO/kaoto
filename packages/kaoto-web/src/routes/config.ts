import { lazy } from 'react';

import { RouteConfigArray } from '../types/routes';

const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const NotFound = lazy(() => import('../pages/NotFound/NotFound'));
const ProjectPage = lazy(() => import('../pages/Project/ProjectPage'));
const ConfigPage = lazy(() => import('../pages/Config/ConfigPage'));
const ProjectConfigPage = lazy(() => import('../pages/ProjectConfig/ProjectConfigPage'));

export const routes: RouteConfigArray = [
  {
    index: true,
    element: Dashboard,
    carbon: {
      label: 'Dashboard',
      inHeader: true,
    },
  },
  {
    path: 'config',
    element: ConfigPage,
  },
  {
    path: 'projects',
    children: [
      {
        path: ':projectId',
        element: ProjectPage,
        children: [
          {
            index: true,
          },
          {
            path: 'integration/:integrationId',
          },
          {
            path: 'config',
            element: ProjectConfigPage,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: NotFound,
    status: 404,
  },
];

// The routes config is a flat structure defined for use with react-router.
// Here we organize the routes into a hierarchy for use by the Carbon header and sidenav
// NOTE: The routes are processed outside of a component as they are not dynamic.
const routesProcessed: RouteConfigArray = routes.map((route) => {
  if (!route.carbon) {
    return route;
  }

  const path = ('path' in route ? route.path : undefined) ?? route.carbon.virtualPath;
  if (!path) return route;

  const subMenu = routes.filter((subRoute) => {
    if (!subRoute.carbon) return false;

    const subPath = ('path' in subRoute ? subRoute.path : undefined) ?? subRoute.carbon.virtualPath;
    return !route.index && subPath;
  });

  if (subMenu && subMenu.length > 0) {
    route.carbon.subMenu = subMenu;
    subMenu.forEach((menu) => {
      const subPath = ('path' in menu ? menu.path : undefined) ?? menu.carbon?.virtualPath;
      menu.carbon = menu.carbon || { label: subPath || '' };
      menu.carbon.inSubMenu = true;
    });
  }

  return route;
});

export const routesInHeader: RouteConfigArray = routesProcessed.filter(
  (route) => route.carbon && route.carbon.inHeader && !route.carbon.inSubMenu,
);

export const routesInSideNav: RouteConfigArray = routesProcessed.filter(
  (route) => route.carbon && route.carbon.inSideNav && !route.carbon.inSubMenu,
);
