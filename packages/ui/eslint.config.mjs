// @ts-check
import vitest from '@vitest/eslint-plugin';
import testingLibrary from 'eslint-plugin-testing-library';

import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    // Enforce the most-specific Vitest assertions (SonarQube typescript:S5906).
    files: ['**/*.test.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      'vitest/prefer-to-have-length': 'error',
      'vitest/prefer-to-be': 'error',
    },
  },
  {
    // Prevent redundant act() wrappers (SonarQube typescript:S8980).
    files: ['**/*.test.{ts,tsx}'],
    plugins: { 'testing-library': testingLibrary },
    rules: {
      'testing-library/no-unnecessary-act': 'error',
    },
  },
];
