const path = require("path");
const webpack = require("webpack");

module.exports = {
  target: ["web"],
  entry: path.resolve(__dirname, "gramjs/index.ts"),
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },

      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      fs: false,
      path: require.resolve("path-browserify"),
      net: false,
      crypto: require.resolve("crypto-browserify"),
      vm: require.resolve("vm-browserify"),
      stream: require.resolve("readable-stream"),
      os: require.resolve("os-browserify/browser"),
      util: require.resolve("util/"),
      assert: false,
      events: false,
      constants: false,
    },
  },
  mode: process.env.NODE_ENV ?? "development",
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
  output: {
    library: "telegram",
    libraryTarget: "umd",
    filename: "telegram.js",
    path: path.resolve(__dirname, "browser"),
  },
};
