const { merge } = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path'); // NOSONAR

const getEnvConfig = (env) => {
  if (env.dev) {
    return {
      minimize: false,
      transpileOnly: false,
      sourceMaps: true,
      mode: 'development',
      live: env.live,
    };
  } else {
    return {
      minimize: true,
      transpileOnly: false,
      sourceMaps: false,
      mode: 'production',
      live: env.live,
    };
  }
};

const commonConfig = (env) => {
  const { transpileOnly, minimize, sourceMaps, mode, live } = getEnvConfig(env);

  console.info(`Webpack :: ts-loader :: transpileOnly: ${transpileOnly}`);
  console.info(`Webpack :: minimize: ${minimize}`);
  console.info(`Webpack :: sourceMaps: ${sourceMaps}`);
  console.info(`Webpack :: mode: ${mode}`);
  console.info(`Webpack :: live: ${live}`);

  const sourceMapsLoader = sourceMaps
    ? [
        {
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
        },
      ]
    : [];

  const devtool = sourceMaps
    ? {
        devtool: 'eval-source-map',
      }
    : {};

  const importsNotUsedAsValues = live ? { importsNotUsedAsValues: 'preserve' } : {};

  return {
    mode,
    optimization: {
      minimize,
    },
    ...devtool,
    module: {
      rules: [
        ...sourceMapsLoader,
        {
          test: /\.m?js/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly,
                compilerOptions: {
                  ...importsNotUsedAsValues,
                  sourceMap: sourceMaps,
                },
              },
            },
          ],
        },
      ],
    },
    ignoreWarnings: [/Failed to parse source map/],
    output: {
      path: path.resolve('./dist'),
      filename: '[name].js',
      chunkFilename: '[name].bundle.js',
      library: 'KaotoEditor',
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: 'this',
    },
    stats: {
      excludeAssets: [(name) => !name.endsWith('.js')],
      excludeModules: true,
    },
    performance: {
      maxAssetSize: 30000000,
      maxEntrypointSize: 30000000,
    },
    resolve: {
      // Required for github.dev and `minimatch` as Webpack 5 doesn't add polyfills automatically anymore.
      fallback: {
        constants: require.resolve('constants-browserify'),
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
        https: false,
        fs: false,
        child_process: false,
        net: false,
        buffer: require.resolve('buffer/'),
        util: false,
        url: false,
        stream: false,
      },
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      modules: ['node_modules'],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(require.resolve('@kaoto/camel-catalog/package.json'), '../dist/camel-catalog'),
            to: 'webview/editors/kaoto/camel-catalog',
          },
        ],
      }),
    ],
    externals: {
      vscode: 'commonjs vscode',
    },
  };
};

const webpack = async (env) => [
  merge(commonConfig(env), {
    target: 'node',
    entry: {
      'extension/extension': './src/extension/extension.ts',
    },
    plugins: [
      new CopyPlugin({
        patterns: [{ from: path.resolve(__dirname, '../ui/dist-webview'), to: 'webview', info: { minimized: true } }],
      }),
    ],
  }),
  merge(commonConfig(env), {
    target: 'webworker',
    entry: {
      'extension/extensionWeb': './src/extension/extensionWeb.ts',
    },
  }),
];

module.exports = async function createWebpackConfig(env) {
  if (env.bridgeTests || env.bridgeWebTests) {
    // The unit runner is CommonJS; bundle the suites that import ESM UI subpaths.
    return {
      mode: 'development',
      target: env.bridgeWebTests ? 'webworker' : 'node',
      entry: env.bridgeWebTests
        ? { index: './src/test/web/index.ts' }
        : {
            'KaotoHostServices.test': './src/test/services/KaotoHostServices.test.ts',
            'KaotoEditorProvider.test': './src/test/extension/KaotoEditorProvider.test.ts',
          },
      output: {
        path: path.resolve(env.bridgeWebTests ? './dist/test/web' : './dist/test/bridge'),
        filename: '[name].js',
        libraryTarget: 'commonjs2',
      },
      externals: { vscode: 'commonjs vscode', chai: 'commonjs chai' },
      resolve: {
        extensions: ['.ts', '.tsx', '.js'],
        fallback: env.bridgeWebTests ? { path: require.resolve('path-browserify') } : {},
      },
      module: {
        rules: [
          {
            test: /\.m?js$/,
            resolve: { fullySpecified: false },
          },
          {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            options: { configFile: 'tsconfig.json', onlyCompileBundledFiles: true },
          },
        ],
      },
    };
  }
  return webpack(env);
};
