// Temporary script to run generation with ts-node
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
        esModuleInterop: true
    }
});

// Now require the generate script
require('./gramjs/tl/types-generator/generate');

// Generate the TL modules
const fs = require('fs');
const path = require('path');

function stripTl(tl) {
    return tl
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
        .replace(/\n\s*\n/g, "\n")
        .replace(/`/g, "\\`");
}

const apiTl = fs.readFileSync(
    path.resolve(__dirname, './gramjs/tl/static/api.tl'),
    "utf-8"
);
fs.writeFileSync(
    path.resolve(__dirname, './gramjs/tl/apiTl.js'),
    `module.exports = \`${stripTl(apiTl)}\`;`
);
console.log('Generated apiTl.js');

const schemaTl = fs.readFileSync(
    path.resolve(__dirname, './gramjs/tl/static/schema.tl'),
    "utf-8"
);
fs.writeFileSync(
    path.resolve(__dirname, './gramjs/tl/schemaTl.js'),
    `module.exports = \`${stripTl(schemaTl)}\`;`
);
console.log('Generated schemaTl.js');

console.log('Done!');
