// @ts-check
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import vscodePackageJson from '../kaoto-vscode/package.json';
import packageJson from './package.json';
import { getLastCommitInfo } from './scripts/get-last-commit-info.mjs';

const lastCommitInfo = await getLastCommitInfo();

export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_HASH: JSON.stringify(lastCommitInfo.hash),
    __GIT_DATE: JSON.stringify(lastCommitInfo.date),
    __KAOTO_VERSION: JSON.stringify(packageJson.version),
    __VSCODE_KAOTO_VERSION: JSON.stringify(vscodePackageJson.version),
  },
  build: {
    outDir: 'dist-webview',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: 'src/webview-vscode-entry.tsx',
      output: {
        entryFileNames: 'KaotoEditorEnvelopeApp.js',
        chunkFileNames: '[name].bundle.js',
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css') ? 'KaotoEditorEnvelopeApp.css' : '[name][extname]',
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
