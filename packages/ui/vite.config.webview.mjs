// @ts-check
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-webview',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: 'src/webview-entry.tsx',
      output: {
        entryFileNames: 'KaotoEditorEnvelopeApp.js',
        chunkFileNames: '[name].bundle.js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  base: './',
  css: {
    preprocessorOptions: {
      scss: { silenceDeprecations: ['mixed-decls'] },
    },
  },
  resolve: {
    alias: [{ find: /^~/, replacement: '' }],
  },
});
