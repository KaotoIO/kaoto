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
          codeSplitting: {
            groups: [
              {
                // Monaco imports each of its 81 built-in languages on demand, which made a chunk per language and put
                // more than 100 JavaScript files in the VSIX, the count above which vsce asks to bundle the extension.
                // The languages share one chunk instead, still loaded when an editor first needs one of them. The
                // `.contribution.js` files register the languages as Monaco starts, so they stay with the editor.
                name: 'monaco-languages',
                test: (id) =>
                  /[\\/]monaco-editor[\\/]esm[\\/]vs[\\/]basic-languages[\\/]/.test(id) &&
                  !id.endsWith('.contribution.js'),
                // The languages import the Monaco editor itself, which is loaded before them. Taking their imports in
                // too would move the whole editor into this chunk.
                includeDependenciesRecursively: false,
              },
            ],
          },
        },
      },
    },
    // public/ holds files of the web app, such as its favicon, that the webview page does not use
    publicDir: false,
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
