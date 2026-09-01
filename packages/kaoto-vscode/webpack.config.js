const { merge } = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path'); // NOSONAR
const { DefinePlugin } = require('webpack');
const { version } = require('./package.json');

function posixPath(pathStr) {
  return pathStr.split(path.sep).join(path.posix.sep);
}

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
      alias: {
        // Pin react and react-dom to a single copy so the webview bundle and
        // @kaoto/kaoto share the same React instance. Both are runtime deps
        // because they are bundled into the webview JS, not resolved at runtime
        // by Node.js.
        // Use require.resolve to find the actual location, which works correctly
        // whether react is in a local node_modules or hoisted to the monorepo root.
        react: path.dirname(require.resolve('react/package.json')),
        'react-dom': path.dirname(require.resolve('react-dom/package.json')),
      },
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
      new DefinePlugin({
        __VSCODE_KAOTO_VERSION: JSON.stringify(version),
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
  }),
  merge(commonConfig(env), {
    target: 'webworker',
    entry: {
      'extension/extensionWeb': './src/extension/extensionWeb.ts',
    },
  }),
  merge(commonConfig(env), {
    target: 'web',
    entry: {
      'webview/KaotoEditorEnvelopeApp': './src/webview/KaotoEditorEnvelopeApp.ts',
    },
    resolve: {
      alias: {
        // @kie-tools-core/editor@10.0.0 references @patternfly/react-core/dist/js/components/Text
        // which was removed in PatternFly 6. Alias to false so webpack provides an empty module;
        // the KeyBindingsHelpOverlay that uses it is not activated in the Kaoto extension.
        '@patternfly/react-core/dist/js/components/Text': false,
      },
    },
    module: {
      rules: [
        {
          test: /\.s[ac]ss$/i,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                sassOptions: {
                  // Silence Sass mixed-decls deprecation warnings from
                  // @carbon/styles and other third-party dependencies.
                  quietDeps: true,
                  silenceDeprecations: ['mixed-decls'],
                },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(svg|ttf|eot|woff|woff2)$/,
          include: [
            {
              or: [
                (input) => posixPath(input).includes('node_modules/@patternfly/react-core/dist/styles/assets/fonts'),
                (input) => posixPath(input).includes('node_modules/@patternfly/react-core/dist/styles/assets/pficon'),
                (input) =>
                  posixPath(input).includes('node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon'),
                (input) =>
                  posixPath(input).includes('node_modules/monaco-editor/dev/vs/base/browser/ui/codicons/codicon'),
              ],
            },
          ],
          type: 'asset',
          generator: {
            filename: 'fonts/[name].[ext]',
          },
        },
        {
          test: /\.(svg|jpg|jpeg|png|gif)$/i,
          type: 'asset',
        },
      ],
    },
    ignoreWarnings: [/Failed to parse source map/],
    stats: {
      errorDetails: true,
      children: true,
    },
  }),
];

module.exports = webpack;
