// @ts-check
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import packageJson from './package.json';
import { camelCatalogPlugin } from './scripts/camel-catalog-plugin.mjs';
import { getCatalogFiles } from './scripts/get-catalog-files.mjs';
import { getLastCommitInfo } from './scripts/get-last-commit-info.mjs';

// https://vitejs.dev/config/

const outDir = './dist';
const lastCommitInfo = await getLastCommitInfo();
const { basePath, files: catalogFiles } = getCatalogFiles();

export default defineConfig({
  plugins: [
    react(),
    camelCatalogPlugin(basePath, catalogFiles),
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
        silenceDeprecations: ['mixed-decls'],
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^~/,
        replacement: '',
      },
    ],
  },
});
