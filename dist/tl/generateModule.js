"use strict";
const fs = require("fs");
const path = require("path");
require("./types-generator/generate");
function main() {
    const apiTl = fs.readFileSync(path.resolve(__dirname, `./static/api.tl`), "utf-8");
    fs.writeFileSync(path.resolve(__dirname, "./apiTl.js"), `module.exports = \`${stripTl(apiTl)}\`;`);
    const schemaTl = fs.readFileSync(path.resolve(__dirname, `./static/schema.tl`), "utf-8");
    fs.writeFileSync(path.resolve(__dirname, "./schemaTl.js"), `module.exports = \`${stripTl(schemaTl)}\`;`);
}
function stripTl(tl) {
    return tl
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
        .replace(/\n\s*\n/g, "\n")
        .replace(/`/g, "\\`");
}
main();
