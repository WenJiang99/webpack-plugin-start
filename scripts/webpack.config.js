const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const PageEntryPlugin = require('./AutoPageEntryPlugin')
// const PageEntryPlugin = require('./PageEntryPlugin')
const src = path.resolve(__dirname, '../src')
module.exports = {
  context: src,
  entry: './app.ts',
  output: {
    filename: "[name].js",
    path: path.resolve('dist')
  },
  mode: 'development',
  resolve:{
    extensions:['.js','.ts']
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        use: ['babel-loader']
      }
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new PageEntryPlugin({ pageDir: 'pages' })
  ]
}
