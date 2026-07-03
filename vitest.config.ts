import react from '@vitejs/plugin-react';
import reactSwc from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Consolidated Vitest configuration for monorepo
// Note: Vitest does not support nested/extended configs, so all configuration is inline
export default defineConfig({
  test: {
    // Global coverage configuration (cannot be set per-project)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    projects: [
      // UI Package (@kaoto/kaoto)
      {
        test: {
          name: 'ui',
          root: './packages/ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./vitest-mocks-setup.ts', './vitest-setup.ts'],
          include: ['src/**/?(*.)+(test).[tj]s?(x)'],
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
            react: path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
            // Use native ESM build to avoid CJS interop issues in wrapper.mjs
            uuid: path.resolve(__dirname, 'node_modules/uuid/dist/esm-node/index.js'),
          },
        },
        plugins: [react()],
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
      },
      // Kaoto Web Package (@kaoto/kaoto-web)
      {
        test: {
          name: 'kaoto-web',
          root: './packages/kaoto-web',
          globals: true,
          environment: 'jsdom',
          setupFiles: './src/test/setup.ts',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
        },
        plugins: [reactSwc()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './packages/kaoto-web/src'),
          },
        },
      },
    ],
  },
});
