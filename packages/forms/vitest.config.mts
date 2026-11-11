import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    include: ['**/?(*.)+(test).[tj]s?(x)'],
    testTimeout: 10_000,
    hookTimeout: 20_000,
    clearMocks: true,
    css: false,
    // Enabled with `--coverage`. The lcov report is the one picked up by the Codecov upload in CI.
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      // Paths are relative to the repository root, as Codecov expects.
      reporter: ['text-summary', ['lcovonly', { projectRoot: fileURLToPath(new URL('../..', import.meta.url)) }]],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/**/stubs/**', 'src/**/__mocks__/**', 'src/testing/**'],
    },
    alias: {
      // Force all packages to use the same React instance
      react: fileURLToPath(new URL('../../node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('../../node_modules/react-dom', import.meta.url)),
    },
  },
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
});
