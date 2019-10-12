const generateErrors = (errors, f) => {
    // Exact/regex match to create {CODE: ErrorClassName}
    const exactMatch = [];
    const regexMatch = [];

    // Find out what subclasses to import and which to create
    const importBase = new Set();
    const createBase = {};

    for (const error of errors) {
        if (error.subclassExists) {
            importBase.add(error.subclass);
        } else {
            createBase[error.subclass] = error.intCode;
        }

        if (error.hasCaptures) {
            regexMatch.push(error);
        } else {
            exactMatch.push(error);
        }
    }

    // Imports and new subclass creation
    f.write(
        `const { RPCError, ${[...importBase.values()].join(
            ', '
        )} } = require('./rpcbaseerrors');`
    );

    f.write("\nconst format = require('string-format');");

    for (const [cls, intCode] of Object.entries(createBase)) {
        f.write(
            `\n\nclass ${cls} extends RPCError {\n    constructor() {\n        this.code = ${intCode};\n    }\n}`
        );
    }

    // Error classes generation
    for (const error of errors) {
        f.write(
            `\n\nclass ${error.name} extends ${error.subclass} {\n    constructor(args) {\n        `
        );

        if (error.hasCaptures) {
            f.write(
                `const ${error.captureName} = Number(args.capture || 0);\n        `
            );
        }

        const capture = error.description.replace(/'/g, "\\'");

        if (error.hasCaptures) {
            f.write(`super(format('${capture}', {${error.captureName}})`);
        } else {
            f.write(`super('${capture}'`);
        }

        f.write(' + RPCError._fmtRequest(args.request));\n');

        if (error.hasCaptures) {
            f.write(
                `        this.${error.captureName} = ${error.captureName};\n`
            );
        }

        f.write('    }\n}\n');
    }

    f.write('\n\nconst rpcErrorsDict = {\n');

    for (const error of exactMatch) {
        f.write(`    ${error.pattern}: ${error.name},\n`);
    }

    f.write('};\n\nconst rpcErrorRe = [\n');

    for (const error of regexMatch) {
        f.write(`    [/${error.pattern}/, ${error.name}],\n`);
    }

    f.write('];');
};

module.exports = {
    generateErrors,
};
