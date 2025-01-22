import type { StorybookConfig } from '@storybook/react-vite';

import { dirname, join } from 'path';
import packageJson from '../../../package.json';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-actions'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-interactions'),
    getAbsolutePath('storybook-addon-remix-react-router'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  docs: {},
  // Configures the static asset folder in> Storybook
  // Requires the catalog-generator build
  staticDirs: [{ from: '../../catalog-generator/dist/camel-catalog', to: 'camel-catalog' }],
  typescript: {
    check: false,
    checkOptions: {},
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop: { parent: { fileName: string } }) =>
        prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
    },
  },
  viteFinal: async (config) => {
    return {
      ...config,
      define: {
        ...config.define,
        __GIT_HASH: JSON.stringify('Demo hash'),
        __GIT_DATE: JSON.stringify('1970-01-01T00:00:00Z'),
        __KAOTO_VERSION: JSON.stringify(packageJson.version),
      },
      css: {
        preprocessorOptions: {
          scss: {
            api: 'modern-compiler',
          },
        },
      },
      resolve: {
        alias: [
          {
            find: /^~.+/,
            replacement: (val) => {
              return val.replace(/^~/, '');
            },
          },
        ],
      },
    };
  },
};
export default config;
