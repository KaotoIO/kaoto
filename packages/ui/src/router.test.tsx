const mockLazyModules = () => {
  jest.doMock('./pages/Design', () => ({ default: () => null }));
  jest.doMock('./pages/SourceCode', () => ({ default: () => null }));
  jest.doMock('./pages/RestDsl', () => ({ default: () => null }));
  jest.doMock('./pages/Catalog', () => ({ default: () => null }));
  jest.doMock('./pages/Beans', () => ({ default: () => null }));
  jest.doMock('./pages/Metadata', () => ({ default: () => null }));
  jest.doMock('./pages/PipeErrorHandler', () => ({ default: () => null }));
  jest.doMock('./pages/Settings', () => ({ default: () => null }));
  jest.doMock('./pages/DataMapperNotYetInBrowser', () => ({ default: () => null }));
  jest.doMock('./pages/DataMapper', () => ({ default: () => null }));
  jest.doMock('./components/DataMapper/debug/page', () => ({ default: () => null }));
};

const getRoutes = async () => {
  const { router } = await import('./router');
  return router as unknown as Array<{
    path?: string;
    index?: boolean;
    lazy?: () => Promise<unknown>;
    children?: unknown[];
  }>;
};

const getChildren = (routes: Array<{ children?: unknown[] }>) =>
  (routes[0]?.children ?? []) as Array<{ path?: string; index?: boolean; lazy?: () => Promise<unknown> }>;

describe('router', () => {
  it('defines the expected routes and lazy loaders (datamapper disabled)', async () => {
    jest.resetModules();
    process.env.VITE_ENABLE_DATAMAPPER_DEBUGGER = 'false';
    const createHashRouter = jest.fn((routes: unknown) => routes);
    jest.doMock('react-router-dom', () => ({ createHashRouter }));
    mockLazyModules();

    const { Links } = await import('./router/links.models');
    const routes = await getRoutes();
    const children = getChildren(routes);

    expect(createHashRouter).toHaveBeenCalledTimes(1);
    expect(routes[0]?.path).toBe(Links.Home);
    expect(children.some((route) => route.index)).toBe(true);
    expect(children.some((route) => route.path === Links.Rest)).toBe(true);
    expect(children.some((route) => route.path === Links.SourceCode)).toBe(true);
    expect(children.some((route) => route.path === Links.Catalog)).toBe(true);
    expect(children.some((route) => route.path === Links.Beans)).toBe(true);
    expect(children.some((route) => route.path === Links.Metadata)).toBe(true);
    expect(children.some((route) => route.path === Links.Settings)).toBe(true);
    expect(children.some((route) => route.path === Links.DataMapper)).toBe(true);
    expect(children.some((route) => route.path === `${Links.DataMapper}/:id`)).toBe(true);

    const lazyPromises = children
      .map((route) => (typeof route.lazy === 'function' ? route.lazy() : undefined))
      .filter(Boolean) as Promise<unknown>[];
    await Promise.all(lazyPromises);
  });

  it('loads datamapper debug page when enabled', async () => {
    jest.resetModules();
    process.env.VITE_ENABLE_DATAMAPPER_DEBUGGER = 'true';
    const createHashRouter = jest.fn((routes: unknown) => routes);
    jest.doMock('react-router-dom', () => ({ createHashRouter }));
    mockLazyModules();

    const { Links } = await import('./router/links.models');
    const routes = await getRoutes();
    const children = getChildren(routes);

    const dataMapperRoute = children.find((route) => route.path === Links.DataMapper);
    expect(dataMapperRoute?.lazy).toBeDefined();
    await dataMapperRoute?.lazy?.();
  });
});
