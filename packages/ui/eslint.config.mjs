// @ts-check
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
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
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
    },
  },
];
