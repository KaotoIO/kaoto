const { merge } = require('webpack-merge');
const CopyPlugin = require('copy-webpack-plugin');
const fs = require('fs'); // NOSONAR
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
        devtool: 'source-map',
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
                  // tsconfig.json inherits `noEmit: true` from the monorepo base; ts-loader needs the emit
                  noEmit: false,
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
      // Resolve workspace packages (@kaoto/kaoto) to their TypeScript sources
      // through the `@kaoto/source` export condition; '...' keeps webpack's default conditions.
      conditionNames: ['@kaoto/source', '...'],
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

const webviewDist = path.resolve(__dirname, '../ui/dist-webview');

const webpack = (env) => {
  // Live mode serves the webview from the Vite dev server, so a development build may skip the bundle.
  // build:prod always builds it first, so a release never ships without one.
  if (env.dev && !fs.existsSync(webviewDist)) {
    console.warn(
      `Webpack :: ${webviewDist} is missing; only the Vite dev server launch can show the editor. ` +
        'Run `yarn workspace @kaoto/kaoto build:webview:dev` to use a prebuilt webview.',
    );
  }
  return [
    merge(commonConfig(env), {
      target: 'node',
      entry: {
        'extension/extension': './src/extension/extension.ts',
      },
      plugins: [
        new CopyPlugin({
          patterns: [
            { from: webviewDist, to: 'webview', info: { minimized: true }, noErrorOnMissing: Boolean(env.dev) },
            { from: path.resolve(__dirname, 'assets/kaoto-host-shim.js'), to: 'webview/kaoto-host-shim.js' },
          ],
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
};

module.exports = webpack;
