import { HeaderMenu, HeaderMenuItem } from '@carbon/react';
import { Link as RouterLink } from 'react-router';

import type { RouteConfigArray } from '../../types/routes';

/**
 * Check if a menu path should be active based on the current path
 * Handles both exact matches and dynamic route segments
 */
const isPathActive = (menuPath: string | undefined, currentPath: string): boolean => {
  if (!menuPath || !currentPath) return false;
  // Exact match
  if (menuPath === currentPath) return true;
  // Match dynamic routes: /dashboard should be active for /dashboard/123
  return currentPath.startsWith(`${menuPath}/`);
};

const renderNavItem = (
  path: string | undefined,
  carbon: NonNullable<RouteConfigArray[number]['carbon']>,
  currentPath: string,
) => {
  if (carbon.subMenu) {
    return (
      <HeaderMenu aria-label={carbon.label!} key={path} menuLinkName={carbon.label!}>
        {carbon.subMenu.map((subRoute) => {
          const subPath = 'path' in subRoute ? subRoute.path : undefined;
          if (!subPath) return null;
          return (
            <HeaderMenuItem as={RouterLink} to={subPath} key={subPath} isActive={isPathActive(subPath, currentPath)}>
              {subRoute.carbon?.label}
            </HeaderMenuItem>
          );
        })}
      </HeaderMenu>
    );
  }

  if (!path) return null;
  return (
    <HeaderMenuItem as={RouterLink} key={path} to={path} isActive={isPathActive(path, currentPath)}>
      {carbon.label}
    </HeaderMenuItem>
  );
};

interface NavHeaderItemsProps {
  routesInHeader: RouteConfigArray;
  currentPath: string;
}

export const NavHeaderItems = ({ routesInHeader, currentPath }: NavHeaderItemsProps) => (
  <>
    {routesInHeader.map((route) => {
      const path = 'path' in route ? route.path : undefined;
      const { carbon } = route;
      return !carbon?.inSubMenu && carbon?.label ? renderNavItem(path, carbon, currentPath) : null;
    })}
  </>
);
