// @ts-check
import importPlugin from 'eslint-plugin-import';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import vitest from '@vitest/eslint-plugin';

import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  importPlugin.flatConfigs.recommended,
  eslintPluginJsxA11y.flatConfigs.recommended,
  pluginReactRefresh.configs.vite,
  {
    ignores: ['coverage/**', 'dist/**', '*.config.{js,mjs,ts}', 'prettier.config.js'],
  },
  {
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      // Carbon React uses default exports in some components
      'import/named': 'off',
      // Enforce blank line after imports
      'import/newline-after-import': ['error', { count: 1 }],
      // TypeScript handles these
      'import/no-unresolved': 'off',
      'import/namespace': 'off',
      // Allow prettier text layout in JSX
      'no-irregular-whitespace': ['error', { skipJSXText: true }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Enforce most-specific Vitest assertions
    files: ['**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/prefer-to-have-length': 'error',
      'vitest/prefer-to-be': 'error',
    },
  },
];
