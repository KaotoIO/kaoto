// @ts-check
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import packageJson from './package.json';
import vscodePackageJson from '../kaoto-vscode/package.json';
import { camelCatalogPlugin } from './scripts/camel-catalog-plugin.mjs';
import { getCatalogFiles } from './scripts/get-catalog-files.mjs';
import { getLastCommitInfo } from './scripts/get-last-commit-info.mjs';

// https://vitejs.dev/config/

const outDir = './dist';
const lastCommitInfo = await getLastCommitInfo();
const { basePath, files: catalogFiles } = getCatalogFiles();

const vscodeDevUrl = process.env['KAOTO_DEV_URL'];
const vscodeDevServer = vscodeDevUrl ? new URL(vscodeDevUrl) : undefined;

export default defineConfig({
  plugins: [react(), camelCatalogPlugin(basePath, catalogFiles)],
  define: {
    __GIT_HASH: JSON.stringify(lastCommitInfo.hash),
    __GIT_DATE: JSON.stringify(lastCommitInfo.date),
    __KAOTO_VERSION: JSON.stringify(packageJson.version),
    ...(vscodeDevUrl ? { __VSCODE_KAOTO_VERSION: JSON.stringify(vscodePackageJson.version) } : {}),
  },
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
      ? {
          origin: (origin, cb) => {
            if (
              !origin ||
              origin.startsWith("vscode-webview://") ||
              /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
            ) {
              cb(null, true);
            } else {
              cb(new Error(`CORS: origin not allowed: ${origin}`), false);
            }
          },
        }
      : undefined,
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
