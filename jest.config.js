/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { isolatedModules: true }],
  },
  testEnvironment: "node",
};
