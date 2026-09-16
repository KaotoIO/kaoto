// @ts-check
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

import { getBuildInfoDefines } from '../../scripts/build-info.mjs';
import { camelCatalogPlugin } from './scripts/camel-catalog-plugin.mjs';
import { getCatalogFiles } from './scripts/get-catalog-files.mjs';

// https://vite.dev/config/

const outDir = './dist';
const { basePath, files: catalogFiles } = getCatalogFiles();

const vscodeDevUrl = process.env['KAOTO_DEV_URL'];
const vscodeDevServer = vscodeDevUrl ? new URL(vscodeDevUrl) : undefined;

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
    host: vscodeDevServer?.hostname,
    port: vscodeDevServer ? Number(vscodeDevServer.port || 5173) : undefined,
    // Asset imports must resolve to Vite, not to the VS Code webview origin.
    origin: vscodeDevUrl,
    strictPort: Boolean(vscodeDevUrl),
    // In VS Code extension dev mode the webview fetches from origin
    // 'vscode-webview://<panel-id>'. Allow that scheme explicitly so the
    // Vite dev server returns the correct Access-Control-Allow-Origin header.
    // Only active when KAOTO_DEV_URL is set by the VS Code launch task.
    cors: vscodeDevUrl
      ? { origin: [/^vscode-webview:\/\//, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/] }
      : undefined,
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
    ],
  },
});
