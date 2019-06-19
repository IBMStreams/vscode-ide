const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function(env, argv) {
  const mode = argv.mode;
  return [
    getExtensionConfig(mode),
    getWebviewsConfig(mode)
  ];
};

function getExtensionConfig(mode) {
  return {
    name: 'extension',
    target: 'node', // VS Code extensions run in a Node.js-context
    entry: './src/extension.ts', // The entry point of this extension
    output: {
      // The bundle is stored in the 'dist' folder
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    devtool: 'source-map', // A full SourceMap is emitted as a separate file
    externals: {
      vscode: 'commonjs vscode' // The vscode module is created on-the-fly and must be excluded
    },
    resolve: {
      extensions: ['.ts', '.js'] // Support reading TypeScript and JavaScript files
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-typescript'
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-object-rest-spread',
                '@babel/plugin-transform-runtime'
              ]
            }
          }
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env'
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-object-rest-spread',
                '@babel/plugin-transform-runtime'
              ]
            }
          }
        }
      ],
    }
  };
}

function getWebviewsConfig(mode) {
  return {
    name: 'webviews',
    context: path.resolve(__dirname, 'src/webviews'),
    entry: {
      icp4d: ['./icp4d/resources/index.js']
    },
    output: {
      path: path.resolve(__dirname, 'dist/webviews'),
      filename: '[name].js'
    },
    devtool: mode === 'production' ? undefined : 'cheap-module-source-map',
    resolve: {
      extensions: ['.js'],
      modules: [path.resolve(__dirname, 'node_modules')]
    },
    module: {
      rules: [
        {
          test: /\.(js)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-react'
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties'
              ]
            }
          }
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
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: 'icp4d/resources/index.html',
        filename: path.resolve(__dirname, 'dist/webviews/icp4d.html'),
        minify: mode === 'production'
          ? {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              useShortDoctype: true
            }
          : false
      })
    ],
    performance: {
      hints: false
    }
  };
}
