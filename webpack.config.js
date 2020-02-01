const path = require('path');

module.exports = {
  mode: 'development',
  // mode: 'production',
  watch: true,
  entry: ['./src/css/main.scss', './src/js/main.js'],
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9111
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: ['babel-loader']
      },
      {
        test: /\.s?css$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: 'main.css',
            },
          },
          {loader: 'extract-loader'},
          {loader: 'css-loader'},
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                includePaths: ['./node_modules'],
              }
            },
          }
        ],
      },
      {
        test: /\.svg$/,
        use: ['url-loader']
      }
    ]
  }
};


