// @ts-check
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { defineConfig } from 'vite';
import packageJson from './package.json';
import { getCatalogFiles } from './scripts/get-catalog-files.mjs';
import { getLastCommitInfo } from './scripts/get-last-commit-info.mjs';

/**
 * Custom Vite plugin to serve and copy Camel Catalog files.
 *
 * vite-plugin-static-copy v4 preserves directory structure relative to the
 * project root, which produces wrong paths for files sourced from node_modules.
 * This plugin handles catalog files directly for both dev and build.
 *
 * @param {string} basePath - The base directory of the catalog package (e.g. .../dist)
 * @param {string[]} catalogFiles - Absolute paths to all catalog JSON/XSD files
 */
function catalogPlugin(basePath, catalogFiles) {
  let resolvedOutDir = '';

  return {
    name: 'kaoto-catalog',
    configResolved(config) {
      resolvedOutDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      const prefix = '/camel-catalog/';
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (!url?.startsWith(prefix)) return next();
        const filePath = join(basePath, decodeURIComponent(url.slice(1)));
        readFile(filePath).then(
          (data) => {
            res.setHeader('Content-Type', filePath.endsWith('.json') ? 'application/json' : 'application/xml');
            res.end(data);
          },
          () => next(),
        );
      });
    },
    async closeBundle() {
      await Promise.all(
        catalogFiles.map(async (file) => {
          const relativePath = relative(basePath, file);
          const destPath = join(resolvedOutDir, relativePath);
          await mkdir(dirname(destPath), { recursive: true });

          const content = readFileSync(file, 'utf-8');
          await writeFile(destPath, file.endsWith('.xsd') ? content : JSON.stringify(JSON.parse(content)));
        }),
      );
    },
  };
}

// https://vitejs.dev/config/

export default defineConfig(async () => {
  const outDir = './dist';
  const lastCommitInfo = await getLastCommitInfo();
  const { basePath, files: catalogFiles } = getCatalogFiles();

  return {
    plugins: [
      react(),
      catalogPlugin(basePath, catalogFiles),
    ],
    define: {
      __GIT_HASH: JSON.stringify(lastCommitInfo.hash),
      __GIT_DATE: JSON.stringify(lastCommitInfo.date),
      __KAOTO_VERSION: JSON.stringify(packageJson.version),
    },
    build: {
      outDir,
      sourcemap: true,
      emptyOutDir: true,
    },
    base: './',
    server: {
      allowedHosts: ['.openshiftapps.com', 'kaotoio.github.io'],
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    resolve: {
      alias: [
        {
          find: /^~(.+)/,
          replacement: '$1',
        },
      ],
    },
  };
});
