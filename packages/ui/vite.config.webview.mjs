// @ts-check
import react from '@vitejs/plugin-react';
import path from 'path'; // NOSONAR
import { defineConfig } from 'vite';

import { getBuildInfoDefines } from '../../scripts/build-info.mjs';

/**
 * `vite build` defaults to production mode: a minified bundle without sourcemaps, as shipped in the VSIX.
 * Use `--mode development` (`build:webview:dev`) for an unminified bundle with inline sourcemaps to debug the webview.
 */
export default defineConfig(async ({ mode }) => {
  const isDevelopment = mode === 'development';

  return {
    plugins: [react()],
    define: await getBuildInfoDefines(),
    build: {
      outDir: 'dist-webview',
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
      alias: [{ find: /^~/, replacement: '' }],
    },
  };
});
