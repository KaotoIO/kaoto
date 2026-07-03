import Dashboard from '../pages/dashboard/Dashboard';
import NotFound from '../pages/not-found/NotFound';
import { RouteConfigArray } from '../types/routes';

// TODO: Uncomment when adding nested routes
// const escapeRegExp = (value: string) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

export const routes: RouteConfigArray = [
  {
    index: true,
    path: '/',
    element: Dashboard,
    carbon: {
      label: 'Dashboard',
      inHeader: true,
    },
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

  const path = route.path || route.carbon.virtualPath;
  if (!path) return route;

  const subMenu = routes.filter((subRoute) => {
    // Only include routes with carbon config in navigation menus
    if (!subRoute.carbon) return false;

    const subPath = subRoute.path || subRoute.carbon.virtualPath;
    // TODO: Re-enable when adding nested routes
    // const childPath = new RegExp(`^${escapeRegExp(path)}/[^/]+$`); // match direct parent only

    return !route.index && subPath; // && childPath.test(subPath);
  });

  if (subMenu && subMenu.length > 0) {
    // add sub menu to parent
    route.carbon.subMenu = subMenu;

    // mark child as in sub menu
    subMenu.forEach((menu) => {
      const subPath = menu.path || menu.carbon?.virtualPath;
      // Carbon should never be blank
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
