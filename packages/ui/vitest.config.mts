import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest-mocks-setup.ts', './vitest-setup.ts'],
    include: ['**/?(*.)+(test).[tj]s?(x)'],
    testTimeout: 10_000,
    hookTimeout: 20_000,
    clearMocks: true,
    css: false,
    server: {
      deps: {
        inline: [
          /@patternfly\/.*/,
          '@kaoto/forms',
          'yaml',
          'monaco-editor',
          'react-monaco-editor',
          'hotkeys-js',
          'uuid',
        ],
      },
    },
    alias: {
      // Force all packages to use the same React instance
      react: new URL('../../node_modules/react', import.meta.url).pathname,
      'react-dom': new URL('../../node_modules/react-dom', import.meta.url).pathname,
      // Use native ESM build to avoid CJS interop issues in wrapper.mjs
      uuid: new URL('../../node_modules/uuid/dist/esm-node/index.js', import.meta.url).pathname,
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
});
