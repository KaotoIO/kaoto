// @ts-check
import react from '@vitejs/plugin-react';
import path from 'path'; // NOSONAR
import { defineConfig } from 'vite';

import { getBuildInfoDefines } from '../../scripts/build-info.mjs';

export default defineConfig({
  plugins: [react()],
  define: await getBuildInfoDefines(),
  build: {
    outDir: 'dist-webview',
    emptyOutDir: true,
    sourcemap: 'inline',
    minify: false,
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
});
