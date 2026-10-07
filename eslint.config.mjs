// @ts-check
import pluginJs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  // kaoto-vscode has its own eslint config — exclude it from the monorepo root config
  { ignores: ['packages/kaoto-vscode/**'] },
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        // The project service (tsserver) understands solution-style tsconfig.json files with
        // `references`, which `project: true` does not (packages/*/tsconfig.json are solutions).
        projectService: true,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  // Enable type-aware linting (required for prefer-readonly / typescript:S2933).
  // Scoped to package source dirs — excludes root-level config/tooling files that
  // have no tsconfig. Each file's owning tsconfig is resolved by the project service.
  {
    files: [
      'packages/editor-api/src/**/*.ts',
      'packages/ui/src/**/*.{ts,tsx}',
      'packages/ui-tests/cypress/**/*.{ts,tsx}',
      'packages/ui-tests/stories/**/*.{ts,tsx}',
      'packages/kaoto-web/src/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/prefer-readonly': 'error',
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      ...pluginReact.configs.flat.recommended.plugins,
      'react-hooks': pluginReactHooks,
    },
  },
  {
    rules: {
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      'react-hooks/config': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/gating': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/incompatible-library': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
      'react-hooks/use-memo': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/no-unstable-nested-components': 'error',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'react/self-closing-comp': 'error',
      'react/jsx-no-constructed-context-values': 'error',
    },
  },
  eslintConfigPrettier,
  eslintPluginPrettier,
];
