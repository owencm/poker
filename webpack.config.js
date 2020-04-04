const path = require("path");

module.exports = {
  entry: "./src/index.mjs",
  output: {
    path: path.resolve(__dirname, "built"),
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      }
    ]
  }
};
