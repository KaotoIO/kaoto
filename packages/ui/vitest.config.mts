import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
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
    // The v8 coverage (`--coverage`) slows the heaviest tests down on the CI runners
    testTimeout: 20_000,
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
    // Enabled with `--coverage`. The lcov report is the one picked up by the Codecov upload in CI.
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      // Paths are relative to the repository root, as Codecov expects.
      reporter: ['text-summary', ['lcovonly', { projectRoot: fileURLToPath(new URL('../..', import.meta.url)) }]],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/public-api.ts',
        'src/**/*.models.ts',
        'src/**/stubs/**',
        'src/**/node-icon-resolver.ts',
        'src/**/index.ts',
        'src/**/router-exports.tsx',
      ],
    },
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
    ],
  },
  resolve: {
    // Resolve workspace packages to their TypeScript sources.
    // Vitest appends its own default conditions (node, development|production) after these.
    conditions: ['@kaoto/source'],
  },
});
