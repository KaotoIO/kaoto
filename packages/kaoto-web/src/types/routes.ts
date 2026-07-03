import { ComponentType } from 'react';

/**
 * Carbon-specific route configuration for navigation components.
 * Contains additional metadata for rendering routes in Carbon's global navigation header and sidebar.
 */
export interface CarbonRoute {
  /** Virtual path for navigation purposes (may differ from actual route path) */
  virtualPath?: string;
  /** Display label for the navigation item */
  label: string;
  /** Whether this route should appear in the global header navigation */
  inHeader?: boolean;
  /** Whether this route should appear in the side navigation panel */
  inSideNav?: boolean;
  /** Whether to render a separator before this navigation item */
  separator?: boolean;
  /** Icon component to display alongside the navigation item */
  icon?: ComponentType;
  /** Nested submenu items for this route */
  subMenu?: RouteConfig[];
  /** Whether this route is part of a submenu (internal use) */
  inSubMenu?: boolean;
  /** External URL for navigation items that link outside the application */
  href?: string;
}

/**
 * Route configuration object that combines React Router properties with Carbon navigation metadata.
 * Used to define application routes with their corresponding navigation behavior.
 */
export interface RouteConfig {
  /** React Router path pattern (e.g., "/dashboard", "/users/:id") */
  path: string;
  /** Whether this is an index route (renders at parent's path) */
  index?: boolean;
  /** React component to render for this route */
  element?: ComponentType;
  /** HTTP status code for error routes (e.g., 404, 500) */
  status?: number;
  /** Carbon-specific navigation configuration */
  carbon?: CarbonRoute;
}

export type RouteConfigArray = RouteConfig[];
