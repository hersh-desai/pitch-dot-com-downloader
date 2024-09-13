const path = require('path');

module.exports = {
  mode: 'production',
  entry: './background.js',
  output: {
    path: path.resolve(__dirname),
    filename: 'background.bundle.js',
  },
  target: 'webworker', // Important for service workers
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
};