import { SideNavLink, SideNavMenu, SideNavMenuItem } from '@carbon/react';
import { Link as RouterLink } from 'react-router';

import type { CarbonRoute, RouteConfigArray } from '../../types/routes';

interface NavSideItemsProps {
  routesInSideNav: RouteConfigArray;
  currentPath: string;
}

const renderSideNavLink = (path: string | undefined, carbon: CarbonRoute, currentPath: string) => {
  if (path) {
    return (
      <SideNavLink key={path} as={RouterLink} to={path} isActive={path === currentPath} renderIcon={carbon.icon}>
        {carbon.label}
      </SideNavLink>
    );
  }
  return (
    <SideNavLink key={carbon.label} href={carbon.href!} renderIcon={carbon.icon}>
      {carbon.label}
    </SideNavLink>
  );
};

const renderSideNavMenuItem = (subRoute: RouteConfigArray[number], currentPath: string) => {
  const path = 'path' in subRoute ? subRoute.path : undefined;
  const { carbon } = subRoute;
  if (path) {
    return (
      <SideNavMenuItem key={path} as={RouterLink} to={path} isActive={path === currentPath}>
        {carbon?.label}
      </SideNavMenuItem>
    );
  }
  return (
    <SideNavMenuItem key={carbon?.label} href={carbon?.href}>
      {carbon?.label}
    </SideNavMenuItem>
  );
};

const renderNavItem = (path: string | undefined, carbon: CarbonRoute, currentPath: string) => {
  if (carbon.subMenu) {
    return (
      <SideNavMenu key={path ?? carbon.label} renderIcon={carbon.icon} title={carbon.label!}>
        {carbon.subMenu.map((subRoute) => renderSideNavMenuItem(subRoute, currentPath))}
      </SideNavMenu>
    );
  }
  return renderSideNavLink(path, carbon, currentPath);
};

export const NavSideItems = ({ routesInSideNav, currentPath }: NavSideItemsProps) => (
  <>
    {routesInSideNav.map((route) => {
      const path = 'path' in route ? route.path : undefined;
      const { carbon } = route;
      return !carbon?.inSubMenu && carbon?.label ? renderNavItem(path, carbon, currentPath) : null;
    })}
  </>
);
