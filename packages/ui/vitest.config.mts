import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // afterAll hooks run in reverse order: vitest-setup.ts restores the spies before the application state is reset
    setupFiles: ['./vitest-mocks-setup.ts', './src/stubs/reset-app-state.setup.ts', './vitest-setup.ts'],
    snapshotSerializers: ['./vitest-snapshot-serializer.ts'],
    include: ['**/?(*.)+(test).[tj]s?(x)'],
    testTimeout: 10_000,
    hookTimeout: 20_000,
    isolate: false,
    sequence: {
      shuffle: {
        files: true,
        tests: false,
      },
    },
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
    },
  },
  resolve: {
    // Resolve workspace packages to their TypeScript sources.
    // Vitest appends its own default conditions (node, development|production) after these.
    conditions: ['@kaoto/source'],
  },
});
