// @ts-check
import { readFileSync } from 'node:fs';
import { extname, relative } from 'node:path';
import { normalizePath } from 'vite';

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
      server.middlewares.use(
        /**
         * @param {import('node:http').IncomingMessage} req
         * @param {import('node:http').ServerResponse} res
         * @param {() => void} next
         */
        (req, res, next) => {
          const url = req.url?.split('?')[0];
          if (!url?.startsWith(CATALOG_PREFIX)) return next();

          const filePath = fileMap.get(url);
          if (!filePath) return next();

          const content = readFileSync(filePath, 'utf-8');
          const contentType = extname(filePath) === '.json' ? 'application/json' : 'application/xml';

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
