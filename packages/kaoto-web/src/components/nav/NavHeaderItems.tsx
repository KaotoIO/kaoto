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

interface NavHeaderItemsProps {
  routesInHeader: RouteConfigArray;
  currentPath: string;
}

export const NavHeaderItems = ({ routesInHeader, currentPath }: NavHeaderItemsProps) => {
  const renderNavItem = (path: string | undefined, carbon: NonNullable<RouteConfigArray[number]['carbon']>) => {
    if (carbon.subMenu) {
      return (
        <HeaderMenu aria-label={carbon.label!} key={path} menuLinkName={carbon.label!}>
          {carbon.subMenu.map((subRoute) => (
            <HeaderMenuItem
              as={RouterLink}
              to={subRoute.path}
              key={subRoute.path}
              isActive={isPathActive(subRoute.path, currentPath)}
            >
              {subRoute.carbon?.label}
            </HeaderMenuItem>
          ))}
        </HeaderMenu>
      );
    }

    return (
      <HeaderMenuItem as={RouterLink} key={path} to={path!} isActive={isPathActive(path, currentPath)}>
        {carbon.label}
      </HeaderMenuItem>
    );
  };

  return (
    <>
      {routesInHeader.map(({ path, carbon }) =>
        !carbon?.inSubMenu && carbon?.label ? renderNavItem(path, carbon) : null,
      )}
    </>
  );
};
