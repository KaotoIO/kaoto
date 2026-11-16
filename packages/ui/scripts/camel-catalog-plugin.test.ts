import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { camelCatalogPlugin } from './camel-catalog-plugin.mjs';

type Middleware = (req: { url?: string }, res: unknown, next: () => void) => void;

describe('camelCatalogPlugin', () => {
  let catalogDir: string;
  let indexFile: string;

  beforeEach(() => {
    catalogDir = mkdtempSync(join(tmpdir(), 'camel-catalog-'));
    indexFile = join(catalogDir, 'index.json');
    writeFileSync(indexFile, '{"catalogs":[]}');
  });

  afterEach(() => {
    rmSync(catalogDir, { recursive: true, force: true });
  });

  const getMiddleware = (base: string): Middleware => {
    const plugin = camelCatalogPlugin(catalogDir, [indexFile]);
    let middleware: Middleware | undefined;
    const server = {
      config: { base },
      middlewares: { use: (fn: Middleware) => (middleware = fn) },
    };
    (plugin.configureServer as unknown as (server: unknown) => void)(server);
    return middleware!;
  };

  const request = (base: string, url: string) => {
    const res = { setHeader: vi.fn(), end: vi.fn() };
    const next = vi.fn();
    getMiddleware(base)({ url }, res, next);
    return { res, next };
  };

  it('serves a catalog file on the root base', () => {
    const { res, next } = request('/', '/camel-catalog/index.json?import');

    expect(next).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(res.end).toHaveBeenCalledWith('{"catalogs":[]}');
  });

  it('serves a starter template as YAML', () => {
    const templateFile = join(catalogDir, 'pipe-1.yaml');
    writeFileSync(templateFile, 'kind: Pipe\n');
    let middleware: Middleware | undefined;
    const plugin = camelCatalogPlugin(catalogDir, [templateFile]);
    (plugin.configureServer as unknown as (server: unknown) => void)({
      config: { base: '/' },
      middlewares: { use: (fn: Middleware) => (middleware = fn) },
    });
    const res = { setHeader: vi.fn(), end: vi.fn() };

    middleware!({ url: '/camel-catalog/pipe-1.yaml' }, res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/yaml');
    expect(res.end).toHaveBeenCalledWith('kind: Pipe\n');
  });

  it('serves a catalog file below a configured base', () => {
    const { res, next } = request('/kaoto/', '/kaoto/camel-catalog/index.json');

    expect(next).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledWith('{"catalogs":[]}');
  });

  it('passes on catalog requests that miss the configured base', () => {
    const { res, next } = request('/kaoto/', '/camel-catalog/index.json');

    expect(next).toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('passes on requests outside the catalog', () => {
    const { res, next } = request('/kaoto/', '/kaoto/src/main.tsx');

    expect(next).toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it('passes on unknown catalog files', () => {
    const { next } = request('/kaoto/', '/kaoto/camel-catalog/missing.json');

    expect(next).toHaveBeenCalled();
  });
});
