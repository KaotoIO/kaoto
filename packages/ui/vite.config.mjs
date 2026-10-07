// @ts-check
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

import { getBuildInfoDefines } from '../../scripts/build-info.mjs';
import { camelCatalogPlugin } from './scripts/camel-catalog-plugin.mjs';
import { getCatalogFiles } from './scripts/get-catalog-files.mjs';
import { fileURLToPath } from 'url';

// https://vite.dev/config/

const outDir = './dist';
const { basePath, files: catalogFiles } = getCatalogFiles();

export default defineConfig({
  plugins: [react(), camelCatalogPlugin(basePath, catalogFiles)],
  define: await getBuildInfoDefines(),
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
        silenceDeprecations: ['if-function'],
      },
    },
  },
  resolve: {
    // Resolve workspace packages to their TypeScript sources
    conditions: ['@kaoto/source', ...defaultClientConditions],
    alias: [
      {
        find: /^~/,
        replacement: '',
      },
      // For linking forms
      { 
        find: '@kaoto/forms', 
        replacement: fileURLToPath(new URL('../forms/src/index.ts', import.meta.url)) 
      },
    ],
  },
});
