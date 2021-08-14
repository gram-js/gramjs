module.exports = {
  exclude: [
    "**/crypto/**/*",
    "**/errors/**/*",
    "**/network/**/*",
    "**/example/**/*",
    "**/extensions/**/*",
    "**/tl/custom/**/*",
    "**/*+(Password|Utils|Version|RequestIter|entityCache).ts",
    "**/*.js",
  ],
  sort: ["source-order"],
  excludeExternals: true,
  excludePrivate: true,
};
