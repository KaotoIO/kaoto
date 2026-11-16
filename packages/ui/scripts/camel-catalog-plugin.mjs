// @ts-check
import { readFileSync } from 'node:fs';
import { extname, relative } from 'node:path';

import { normalizePath } from 'vite';

/** @type {Record<string, string>} */
const CONTENT_TYPES = { '.json': 'application/json', '.yaml': 'application/yaml' };

/**
 * Custom Vite plugin to serve and bundle @kaoto/camel-catalog files.
 *
 * - Dev: serves catalog files via a pre-hook middleware (runs before Vite's SPA fallback)
 * - Build: emits catalog files as Rollup assets via generateBundle
 *
 * @param {string} basePath - root path of the catalog package on disk
 * @param {string[]} catalogFiles - absolute paths to each catalog file
 * @returns {import('vite').Plugin}
 */
export function camelCatalogPlugin(basePath, catalogFiles) {
  const CATALOG_PREFIX = '/camel-catalog/';

  /** @type {Map<string, string>} URL path -> absolute filesystem path */
  const fileMap = new Map();
  for (const file of catalogFiles) {
    const relativePath = normalizePath(relative(basePath, file));
    fileMap.set(CATALOG_PREFIX + relativePath, file);
  }

  return {
    name: 'kaoto-camel-catalog',

    configureServer(server) {
      // This middleware runs before Vite strips the configured base, so a request below e.g. `/kaoto/` arrives
      // as `/kaoto/camel-catalog/...`. Strip the base here; `base: './'` resolves to `/` on the dev server.
      const base = server.config.base;

      server.middlewares.use(
        /**
         * @param {import('node:http').IncomingMessage} req
         * @param {import('node:http').ServerResponse} res
         * @param {() => void} next
         */
        (req, res, next) => {
          const requestPath = req.url?.split('?')[0];
          if (!requestPath?.startsWith(base)) {
            next();
            return;
          }

          const url = `/${requestPath.slice(base.length)}`;
          if (!url.startsWith(CATALOG_PREFIX)) {
            next();
            return;
          }

          const filePath = fileMap.get(url);
          if (!filePath) {
            next();
            return;
          }

          const content = readFileSync(filePath, 'utf-8');
          const contentType = CONTENT_TYPES[extname(filePath)] ?? 'application/xml';

          res.setHeader('Content-Type', contentType);
          res.end(content);
        },
      );
    },

    generateBundle() {
      for (const [urlPath, filePath] of fileMap) {
        const content = readFileSync(filePath, 'utf-8');
        const isJson = extname(filePath) === '.json';

        this.emitFile({
          type: 'asset',
          fileName: urlPath.slice(1), // strip leading /
          source: isJson ? JSON.stringify(JSON.parse(content)) : content,
        });
      }
    },
  };
}
