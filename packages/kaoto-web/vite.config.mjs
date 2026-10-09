// @ts-check
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { defaultClientConditions, defineConfig } from 'vite';

import { getBuildInfoDefines } from '../../scripts/build-info.mjs';

// https://vite.dev/config/

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [react()],
  define: await getBuildInfoDefines(),
  resolve: {
    // Resolve workspace packages to their TypeScript sources
    conditions: ['@kaoto/source', ...defaultClientConditions],
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['if-function'],
      },
    },
  },
});
