const path = require('path');
const SvgInliner = require('sass-inline-svg');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'development',
  // watch: true,
  entry: {
    'main': ['./src/css/main.scss', './src/js/main.js'],
    // 'sw': './src/js/sw.js',
    // 'crypto_worker': './src/js/crypto_worker.js',
    // 'webp_worker': './src/js/webp_worker.js',
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, 'dist')
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    liveReload: false,
    port: 9111
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: ["@babel/plugin-proposal-class-properties", "@babel/plugin-syntax-dynamic-import"]
            }
          }
        ]
      },
      {
        test: /\.module\.s?css$/,
        use: [
          {loader: 'css-loader'}
        ]
      },
      {
        test: /\.s?css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              esModule: true,
            },
          },
          {
            loader: 'css-loader'
          },
          // {
          //   loader: 'file-loader',
          //   options: {
          //     name: '[name].css',
          //   },
          // },
          {
            loader: 'postcss-loader'
          },
          {
            loader: 'sass-loader',
            options: {
              implementation: require('node-sass'),
              sassOptions: {
                includePaths: ['./node_modules'],
                functions: {svg: SvgInliner('./src/css', {encodingFormat: 'uri'})}
              }
            },
          }
        ],
      },
      {
        test: /\.(png|jpg|gif|ico)$/,
        loader: 'file-loader'
      }
    ]
  }
};
