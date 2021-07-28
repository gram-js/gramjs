module.exports = {
  exclude: [
    "**/crypto/**/*",
    "**/errors/**/*",
    "**/network/**/*",
    "**/example/**/*",
    "**/extensions/**/*",
    "**/*+(Password|Version|RequestIter|entityCache).ts",
    "**/*.js",
  ],
  sort: ["source-order"],
  excludeExternals: true,
  excludePrivate: true,
};
