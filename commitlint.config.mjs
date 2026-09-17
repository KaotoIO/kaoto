export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Extend the default type list with 'e2e', which is used in this repo for E2E test commits
    'type-enum': [
      2,
      'always',
      ['build', 'chore', 'ci', 'docs', 'e2e', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'],
    ],
  },
};
