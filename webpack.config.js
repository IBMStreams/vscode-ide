const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const htmlMinifyOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true
};

module.exports = function (env, argv) {
  const { mode } = argv;
  return [
    getExtensionConfig(mode),
    getWebviewsConfig(mode)
  ];
};

function getExtensionConfig(mode) {
  return {
    name: 'extension',
    target: 'node',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '[absolute-resource-path]'
    },
    devtool: 'source-map',
    externals: {
      vscode: 'commonjs vscode',
      bufferutil: 'commonjs bufferutil',
      'utf-8-validate': 'commonjs utf-8-validate'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.(j|t)sx?$/,
          include: /@streams[\\\/]common/,
          enforce: 'pre',
          loader: 'source-map-loader'
        },
        {
          test: /\.ts$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
          options: {
            sourceMaps: true,
          }
        },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: [
            /node_modules/,
            /src\/webviews/
          ],
          options: {
            sourceMaps: true,
          }
        }
      ]
    }
  };
}

function getWebviewsConfig(mode) {
  return {
    name: 'webviews',
    context: path.resolve(__dirname, 'src/webviews'),
    entry: {
      streamsAuthentication: ['./streamsAuthentication/resources/index.js'],
      configureJobSubmission: ['./configureJobSubmission/resources/index.js'],
      jobGraph: ['./jobGraph/resources/index.js'],
      instanceSelection: ['./instanceSelection/resources/index.js']
    },
    output: {
      path: path.resolve(__dirname, 'dist/webviews'),
      filename: '[name].js'
    },
    devtool: mode === 'production' ? undefined : 'eval-source-map',
    resolve: {
      extensions: ['.ts', '.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        react: path.resolve('./node_modules/react')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          loader: 'babel-loader',
          exclude: /node_modules/
        },
        {
          test: /\.(js)$/,
          loader: 'babel-loader',
          exclude: /node_modules/
        },
        {
          test: /\.jsx?$/,
          include: /@streams[\\\/]graph|@elyra[\\\/]canvas/,
          enforce: 'pre',
          loader: 'source-map-loader'
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader'
            }
          ]
        },
        {
          test: /\.scss$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                importLoaders: 1
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                sassOptions: {
                  includePaths: ['node_modules']
                }
              }
            }
          ]
        },
        {
          test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            limit: 10000
          }
        }
      ]
    },
    node: {
      console: true,
      child_process: 'empty',
      net: 'empty',
      tls: 'empty',
      fs: 'empty'
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: 'streamsAuthentication/resources/index.html',
        filename: path.resolve(__dirname, 'dist/webviews/streamsAuthentication.html'),
        minify: mode === 'production' ? htmlMinifyOptions : false
      }),
      new HtmlWebpackPlugin({
        template: 'configureJobSubmission/resources/index.html',
        filename: path.resolve(__dirname, 'dist/webviews/configureJobSubmission.html'),
        minify: mode === 'production' ? htmlMinifyOptions : false
      }),
      new HtmlWebpackPlugin({
        template: 'jobGraph/resources/index.html',
        filename: path.resolve(__dirname, 'dist/webviews/jobGraph.html'),
        minify: mode === 'production' ? htmlMinifyOptions : false
      }),
      new HtmlWebpackPlugin({
        template: 'instanceSelection/resources/index.html',
        filename: path.resolve(__dirname, 'dist/webviews/instanceSelection.html'),
        minify: mode === 'production' ? htmlMinifyOptions : false
      })
    ],
    performance: {
      hints: false
    }
  };
}
