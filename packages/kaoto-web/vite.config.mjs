// @ts-check
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { defaultClientConditions, defineConfig } from 'vite';

import { getBuildInfoDefines } from '../../scripts/build-info.mjs';
import { camelCatalogPlugin } from '../ui/scripts/camel-catalog-plugin.mjs';
import { getCatalogFiles } from '../ui/scripts/get-catalog-files.mjs';

// https://vite.dev/config/

// Serve and bundle the @kaoto/camel-catalog files at /camel-catalog/ for the RouteVisualization component
const { basePath: catalogBasePath, files: catalogFiles } = getCatalogFiles();

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [react(), camelCatalogPlugin(catalogBasePath, catalogFiles)],
  define: await getBuildInfoDefines(),
  resolve: {
    // Resolve workspace packages to their TypeScript sources
    conditions: ['@kaoto/source', ...defaultClientConditions],
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      // The @kaoto/kaoto sources import PatternFly stylesheets with the `~` prefix (see packages/ui/vite.config.mjs)
      { find: /^~/, replacement: '' },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['if-function'],
      },
    },
  },
});
