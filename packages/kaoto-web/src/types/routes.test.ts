import { describe, expectTypeOf, it } from 'vitest';

import type { PathRouteConfig, RouteConfigArray } from './routes';

describe('PathRouteConfig', () => {
  it('accepts children as an optional RouteConfigArray', () => {
    const route: PathRouteConfig = {
      path: 'projects/:projectId',
      children: [{ path: 'integration/:id' }],
    };
    expectTypeOf(route.children).toEqualTypeOf<RouteConfigArray | undefined>();
  });

  it('accepts a route with no children', () => {
    const route: PathRouteConfig = { path: 'about' };
    expectTypeOf(route.children).toEqualTypeOf<RouteConfigArray | undefined>();
  });
});
