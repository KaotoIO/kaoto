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
    ignores: ['coverage/**', 'dist/**', '*.config.{js,mjs,ts}', 'prettier.config.js', 'scripts/**'],
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
  {
    // Tests run with `isolate: false`: a vi.mock() in one file leaks into the other files of the same worker,
    // or doesn't apply when the module was already loaded, and vi.resetModules() resets the module cache of the whole
    // worker. Global mocks belong in vitest-mocks-setup.ts.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='vi'][callee.property.name=/^(mock|doMock|unmock|doUnmock|resetModules)$/]",
          message:
            'Module mocks and module resets leak between test files because Vitest isolation is disabled. Spy on the real object with vi.spyOn(), render with real providers, or add a global mock to vitest-mocks-setup.ts.',
        },
      ],
    },
  },
];
