const path = require("path");

module.exports = {
  entry: "./src/index.js",
  context: path.resolve(__dirname, "./"),
  target: "webworker",
  mode: "production",
  experiments: {
    outputModule: true,
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    module: true,
    chunkFormat: "module",
    library: {
      type: "module",
    },
  },
  module: {
    rules: [
      {
        include: /node_modules/,
        test: /\.mjs$/,
        type: "javascript/auto",
      },
    ],
  },
};

