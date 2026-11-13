// @ts-check
import react from '@vitejs/plugin-react';
import path from 'path'; // NOSONAR
import { defaultClientConditions, defineConfig } from 'vite';

import { getBuildInfoDefines } from '../../scripts/build-info.mjs';

const buildInfoDefines = await getBuildInfoDefines();

/**
 * `vite build` defaults to production mode: a minified bundle without sourcemaps, as shipped in the VSIX.
 * Use `--mode development` (`build:webview:dev`) for an unminified bundle with inline sourcemaps to debug the webview.
 */
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';

  return {
    plugins: [react()],
    define: buildInfoDefines,
    build: {
      outDir: 'dist-webview',
      // One stylesheet, linked by the webview HTML before the bundle runs. Split chunks are only fetched with the
      // dynamic import that needs them, so the styles of components shared with the entry, such as the loaders shown
      // while the editor starts, would be missing until a lazy page loads.
      cssCodeSplit: false,
      emptyOutDir: true,
      sourcemap: isDevelopment ? 'inline' : false,
      minify: !isDevelopment,
      rollupOptions: {
        input: 'src/webview/start.tsx',
        output: {
          entryFileNames: 'KaotoEditor.js',
          chunkFileNames: '[name].bundle.js',
          assetFileNames: (assetInfo) => (assetInfo.name?.endsWith('.css') ? 'KaotoEditor.css' : '[name][extname]'),
          sourcemapPathTransform: (relativeSourcePath, sourcemapPath) =>
            path.resolve(path.dirname(sourcemapPath), relativeSourcePath),
        },
      },
    },
    base: './',
    css: {
      preprocessorOptions: {
        scss: { silenceDeprecations: ['if-function'] },
      },
    },
    resolve: {
      // Resolve workspace packages to their TypeScript sources
      conditions: ['@kaoto/source', ...defaultClientConditions],
      alias: [{ find: /^~/, replacement: '' }],
    },
  };
});
