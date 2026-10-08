import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // afterAll hooks run in reverse order: vitest-setup.ts restores the spies before the application state is reset
    setupFiles: ['./src/__mocks__/vitest-mocks-setup.ts', './src/stubs/reset-app-state.setup.ts', './src/__mocks__/vitest-setup.ts'],
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
    alias: [
      // Force all packages to use the same React instance
      { find: /^react$/, replacement: fileURLToPath(new URL('../../node_modules/react', import.meta.url)) },
      {
        find: /^react-dom$/,
        replacement: fileURLToPath(new URL('../../node_modules/react-dom', import.meta.url)),
      },
      // Use native ESM build to avoid CJS interop issues in wrapper.mjs
      {
        find: /^uuid$/,
        replacement: fileURLToPath(new URL('../../node_modules/uuid/dist/esm-node/index.js', import.meta.url)),
      },
      // For linking forms — more specific subpaths must come before the bare specifier
      {
        find: /^@kaoto\/forms\/testing\/page-object$/,
        replacement: fileURLToPath(new URL('../forms/src/testing/KaotoFormPageObject.ts', import.meta.url)),
      },
      {
        find: /^@kaoto\/forms\/testing$/,
        replacement: fileURLToPath(new URL('../forms/src/testing.ts', import.meta.url)),
      },
      {
        find: /^@kaoto\/forms$/,
        replacement: fileURLToPath(new URL('../forms/src/index.ts', import.meta.url)),
      },
    ],
  },
  resolve: {
    // Resolve workspace packages to their TypeScript sources.
    // Vitest appends its own default conditions (node, development|production) after these.
    conditions: ['@kaoto/source'],
  },
});
