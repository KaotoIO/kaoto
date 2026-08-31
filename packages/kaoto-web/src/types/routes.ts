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

/** Shared fields for all route configuration objects. */
interface RouteConfigBase {
  /** React component to render for this route */
  element?: ComponentType;
  /** HTTP status code for error routes (e.g., 404, 500) */
  status?: number;
  /** Carbon-specific navigation configuration */
  carbon?: CarbonRoute;
}

/** Index route — renders at the parent's path; must not carry a path of its own. */
export interface IndexRouteConfig extends RouteConfigBase {
  index: true;
  path?: never;
}

/** Path route — renders at an explicit path pattern; must not be an index route. */
export interface PathRouteConfig extends RouteConfigBase {
  path: string;
  index?: false;
}

/**
 * Route configuration object that combines React Router properties with Carbon navigation metadata.
 * Used to define application routes with their corresponding navigation behavior.
 */
export type RouteConfig = IndexRouteConfig | PathRouteConfig;

export type RouteConfigArray = RouteConfig[];
