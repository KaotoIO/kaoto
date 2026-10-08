import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Both files pull the shared setup from @kaoto/kaoto; append further local setup files here
    setupFiles: ['./vitest-mocks-setup.ts', './vitest-setup.ts'],
    include: ['**/?(*.)+(test).[tj]s?(x)'],
    typecheck: {
      enabled: true,
      include: ['**/?(*.)+(test).ts'],
      tsconfig: './tsconfig.app.json',
    },
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
      react: fileURLToPath(new URL('../../node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('../../node_modules/react-dom', import.meta.url)),
      // Use native ESM build to avoid CJS interop issues in wrapper.mjs
      uuid: fileURLToPath(new URL('../../node_modules/uuid/dist/esm-node/index.js', import.meta.url)),
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  resolve: {
    // Resolve workspace packages to their TypeScript sources.
    // Vitest appends its own default conditions (node, development|production) after these.
    conditions: ['@kaoto/source'],
  },
});
