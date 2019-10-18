const fs = require('fs');
const path = require('path');
const format = require('string-format');
const { DocsWriter } = require('../docswriter');
const { TLObject, Usability } = require('../parsers');
const { snakeToCamelCase } = require('../utils');

const CORE_TYPES = new Set([
    'int',
    'long',
    'int128',
    'int256',
    'double',
    'vector',
    'string',
    'bool',
    'true',
    'bytes',
    'date',
]);

const mkdir = (path) => fs.mkdirSync(path, { recursive: true });

const titleCase = (text) =>
    text
        .toLowerCase()
        .split(/(\W)/)
        .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
        .join('');

/**
 * ``ClassName -> class_name.html``.
 */
const getFileName = (tlobject) => {
    const name = tlobject instanceof TLObject ? tlobject.name : tlobject;
    // Courtesy of http://stackoverflow.com/a/1176023/4759433
    const s1 = name.replace(/(.)([A-Z][a-z]+)/, '$1_$2');
    const result = s1.replace(/([a-z0-9])([A-Z])/, '$1_$2').toLowerCase();
    return `${result}.html`;
};

/**
 * ``TLObject -> const { ... } = require(...);``.
 */
const getImportCode = (tlobject) => {
    const kind = tlobject.isFunction ? 'functions' : 'types';
    const ns = tlobject.namespace ? `/${tlobject.namespace}` : '';
    return `const { ${tlobject.className} } = require('gramjs/tl/${kind}${ns}');`;
};

/**
 * Returns the path for the given TLObject.
 */
const getPathFor = (tlobject) => {
    let outDir = tlobject.isFunction ? 'methods' : 'constructors';

    if (tlobject.namespace) {
        outDir += `/${tlobject.namespace}`;
    }

    return `${outDir}/${getFileName(tlobject)}`;
};

/**
 * Similar to `getPathFor` but for only type names.
 */
const getPathForType = (type) => {
    if (CORE_TYPES.has(type.toLowerCase())) {
        return `index.html#${type.toLowerCase()}`;
    } else if (type.includes('.')) {
        const [namespace, name] = type.split('.');
        return `types/${namespace}/${getFileName(name)}`;
    } else {
        return `types/${getFileName(type)}`;
    }
};

/**
 * Finds the <title> for the given HTML file, or (Unknown).
 */
const findTitle = (htmlFile) => {
    const f = fs.readFileSync(htmlFile, { encoding: 'utf-8' });

    for (const line of f.split('\n')) {
        if (line.includes('<title>')) {
            // +7 to skip '<title>'.length
            return line.slice(
                line.indexOf('<title>') + 7,
                line.indexOf('</title>')
            );
        }
    }

    return '(Unknown)';
};

/**
 * Builds the menu used for the current ``DocumentWriter``.
 */
const buildMenu = (docs) => {
    const paths = [];
    let current = docs.filename;

    while (current !== '.') {
        current = path.join(current, '..');
        paths.push(current);
    }

    for (const path_ of paths.reverse()) {
        const name = path.parse(path_).name;

        docs.addMenu(
            name === '.' ? 'API' : titleCase(name),
            `${path_}/index.html`
        );
    }

    if (path.parse(docs.filename).name !== 'index') {
        docs.addMenu(docs.title, docs.filename);
    }

    docs.endMenu();
};

/**
 * Generates the index file for the specified folder
 */
const generateIndex = (folder, paths, botsIndex, botsIndexPaths) => {
    botsIndexPaths = botsIndexPaths || [];

    // Determine the namespaces listed here (as sub folders)
    // and the files (.html files) that we should link to
    const namespaces = [];
    const files = [];
    const INDEX = 'index.html';
    const BOT_INDEX = 'botindex.html';

    for (const item of botsIndexPaths.length ? botsIndexPaths : fs.readdirSync(folder)) {
        const fullPath = botsIndexPaths.length ? item : `${folder}/${item}`;

        if (fs.statSync(fullPath).isDirectory()) {
            namespaces.push(fullPath);
        } else if (![INDEX, BOT_INDEX].includes(item)) {
            files.push(fullPath);
        }
    }

    // Now that everything is setup, write the index.html file
    const filename = `${folder}/${botsIndex ? BOT_INDEX : INDEX}`;
    const docs = new DocsWriter(filename, getPathForType).open();

    // Title should be the current folder name
    docs.writeHead(
        titleCase(folder.replace(new RegExp(`\\${path.sep}`, 'g'), '/')),
        paths.css,
        paths.defaultCss
    );

    docs.setMenuSeparator(paths.arrow);
    buildMenu(docs);
    docs.writeTitle(
        titleCase(
            path
                .join(filename, '..')
                .replace(new RegExp(`\\${path.sep}`, 'g'), '/')
        )
    );

    if (botsIndex) {
        docs.writeText(
            `These are the methods that you may be able to use as a bot. Click <a href="${INDEX}">here</a> to view them all.`
        );
    } else {
        docs.writeText(
            `Click <a href="${BOT_INDEX}">here</a> to view the methods that you can use as a bot.`
        );
    }

    if (namespaces.length) {
        docs.writeTitle('Namespaces', 3);
        docs.beginTable(4);
        namespaces.sort();

        for (const namespace of namespaces) {
            // For every namespace, also write the index of it
            const namespacePaths = [];

            if (botsIndex) {
                for (const item of botsIndexPaths) {
                    if (path.relative(item, '..') === namespace) {
                        namespacePaths.push(item);
                    }
                }
            }

            generateIndex(namespace, paths, botsIndex, namespacePaths);

            docs.addRow(
                titleCase(path.parse(namespace).name),
                `${namespace}/${botsIndex ? BOT_INDEX : INDEX}`
            );
        }

        docs.endTable();
    }

    docs.writeTitle('Available items');
    docs.beginTable(2);

    files
        .sort((x, y) => x.localeCompare(y))
        .forEach((file) => {
            docs.addRow(findTitle(file), file);
        });

    docs.endTable();
    docs.endBody();
    docs.close();
};

/**
 * Generates a proper description for the given argument.
 */
const getDescription = (arg) => {
    const desc = [];
    let otherwise = false;

    if (arg.canBeInferred) {
        desc.push('If left unspecified, it will be inferred automatically.');
        otherwise = true;
    } else if (arg.isFlag) {
        desc.push(
            'This argument defaults to <code>null</code> and can be omitted.'
        );
        otherwise = true;
    }

    if (
        [
            'InputPeer',
            'InputUser',
            'InputChannel',
            'InputNotifyPeer',
            'InputDialogPeer',
        ].includes(arg.type)
    ) {
        desc.push(
            'Anything entity-like will work if the library can find its <code>Input</code> version (e.g., usernames, <code>Peer</code>, <code>User</code> or <code>Channel</code> objects, etc.).'
        );
    }

    if (arg.isVector) {
        if (arg.isGeneric) {
            desc.push('A list of other Requests must be supplied.');
        } else {
            desc.push('A list must be supplied.');
        }
    } else if (arg.isGeneric) {
        desc.push('A different Request must be supplied for this argument.');
    } else {
        otherwise = false; // Always reset to false if no other text is added
    }

    if (otherwise) {
        desc.splice(1, 0, 'Otherwise,');
        desc[desc.length - 1] =
            desc[desc.length - 1].slice(0, -1).toLowerCase() +
            desc[desc.length - 1].slice(1);
    }

    return desc
        .join(' ')
        .replace(
            /list/g,
            '<span class="tooltip" title="Any iterable that supports .length will work too">list</span>'
        );
};

/**
 * Copies the src file into dst applying the replacements dict
 */
const copyReplace = (src, dst, replacements) => {
    const infile = fs.readFileSync(src, { encoding: 'utf-8' });

    fs.writeFileSync(
        dst,
        format(infile, replacements)
        // infile.replace(
        //     new RegExp(
        //         Object.keys(replacements)
        //             .map(k => escapeRegex(k))
        //             .join('|')
        //     ),
        //     m => replacements[m].toString()
        // )
    );
};

/**
 * Generates the documentation HTML files from from ``scheme.tl``
 * to ``/methods`` and ``/constructors``, etc.
 */
const writeHtmlPages = (tlobjects, methods, layer, inputRes) => {
    // Save 'Type: [Constructors]' for use in both:
    // * Seeing the return type or constructors belonging to the same type.
    // * Generating the types documentation, showing available constructors.
    const paths = {
        '404': '404.html',
        'css': 'css',
        'arrow': 'img/arrow.svg',
        'search.js': 'js/search.js',
        'indexAll': 'index.html',
        'botIndex': 'botindex.html',
        'indexTypes': 'types/index.html',
        'indexMethods': 'methods/index.html',
        'indexConstructors': 'constructors/index.html',
        'defaultCss': 'light',
    };

    const typeToConstructors = {};
    const typeToFunctions = {};

    for (const tlobject of tlobjects) {
        const d = tlobject.isFunction ? typeToFunctions : typeToConstructors;

        if (!d[tlobject.innermostResult]) {
            d[tlobject.innermostResult] = [];
        }

        d[tlobject.innermostResult].push(tlobject);
    }

    for (const [t, cs] of Object.entries(typeToConstructors)) {
        typeToConstructors[t] = cs.sort((x, y) => x.name.localeCompare(y.name));
    }

    methods = methods.reduce((x, m) => ({ ...x, [m.name]: m }), {});
    const botDocsPath = [];

    for (const tlobject of tlobjects) {
        const filename = getPathFor(tlobject);
        const docs = new DocsWriter(filename, getPathForType).open();
        docs.writeHead(tlobject.className, paths.css, paths.defaultCss);

        // Create the menu (path to the current TLObject)
        docs.setMenuSeparator(paths.arrow);
        buildMenu(docs);

        // Create the page title
        docs.writeTitle(tlobject.className);

        if (tlobject.isFunction) {
            let start;

            if (tlobject.usability === Usability.USER) {
                start = '<strong>Only users</strong> can';
            } else if (tlobject.usability === Usability.BOT) {
                botDocsPath.push(filename);
                start = '<strong>Only bots</strong> can';
            } else if (tlobject.usability === Usability.BOTH) {
                botDocsPath.push(filename);
                start = '<strong>Both users and bots</strong> can';
            } else {
                botDocsPath.push(filename);
                start = 'Both users and bots <strong>may</strong> be able to';
            }

            docs.writeText(
                `${start} use this method. <a href="#examples">See code examples.</a>`
            );
        }

        // Write the code definition for this TLObject
        docs.writeCode(tlobject);
        docs.writeCopyButton(
            'Copy import to clipboard',
            getImportCode(tlobject)
        );

        // Write the return type (or constructors belonging to the same type)
        docs.writeTitle(tlobject.isFunction ? 'Returns' : 'Belongs to', 3);

        let [genericArg] = tlobject.args
            .filter((arg) => arg.genericDefinition)
            .map((arg) => arg.name);

        if (tlobject.result === genericArg) {
            //  We assume it's a function returning a generic type
            [genericArg] = tlobject.args
                .filter((arg) => arg.isGeneric)
                .map((arg) => arg.name);

            docs.writeText(
                `This function returns the result of whatever the result from invoking the request passed through <i>${genericArg}</i> is.`
            );
        } else {
            let inner = tlobject.result;

            if (/^vector</i.test(tlobject.result)) {
                docs.writeText('A list of the following type is returned.');
                inner = tlobject.innermostResult;
            }

            docs.beginTable(1);
            docs.addRow(inner, getPathForType(inner));
            docs.endTable();

            const cs = typeToConstructors[inner] || [];
            if (!cs.length) {
                docs.writeText('This type has no instances available.');
            } else if (cs.length === 1) {
                docs.writeText('This type can only be an instance of:');
            } else {
                docs.writeText('This type can be an instance of either:');
            }

            docs.beginTable(2);

            for (const constructor of cs) {
                const link = getPathFor(constructor);
                docs.addRow(constructor.className, link);
            }

            docs.endTable();
        }

        // Return (or similar types) written. Now parameters/members
        docs.writeTitle(tlobject.isFunction ? 'Parameters' : 'Members', 3);

        // Sort the arguments in the same way they're sorted
        // on the generated code (flags go last)
        const args = tlobject
            .sortedArgs()
            .filter((a) => !a.flagIndicator && !a.genericDefinition);

        if (args.length) {
            // Writing parameters
            docs.beginTable(3);

            for (const arg of args) {
                // Name row
                docs.addRow(arg.name, null, true);

                // Type row
                const friendlyType = arg.type === 'true' ? 'flag' : arg.type;
                if (arg.isGeneric) {
                    docs.addRow(`!${friendlyType}`, null, null, 'center');
                } else {
                    docs.addRow(
                        friendlyType,
                        getPathForType(arg.type),
                        null,
                        'center'
                    );
                }

                // Add a description for this argument
                docs.addRow(getDescription(arg));
            }

            docs.endTable();
        } else {
            if (tlobject.isFunction) {
                docs.writeText('This request takes no input parameters.');
            } else {
                docs.writeText('This type has no members.');
            }
        }

        if (tlobject.isFunction) {
            docs.writeTitle('Known RPC errors');
            const methodInfo = methods[tlobject.fullname];
            const errors = methodInfo && methodInfo.errors;

            if (!errors || !errors.length) {
                docs.writeText(
                    'This request can\'t cause any RPC error as far as we know.'
                );
            } else {
                docs.writeText(
                    `This request can cause ${errors.length} known error${
                        errors.length === 1 ? '' : 's'
                    }:`
                );

                docs.beginTable(2);

                for (const error of errors) {
                    docs.addRow(`<code>${error.name}</code>`);
                    docs.addRow(`${error.description}.`);
                }

                docs.endTable();
                docs.writeText(
                    'You can import these from <code>gramjs/errors</code>.'
                );
            }

            docs.writeTitle('Example', null, 'examples');
            if (tlobject.friendly) {
                const [ns, friendly] = tlobject.friendly;
                docs.writeText(
                    `Please refer to the documentation of <a href="https://docs.telethon.dev/en/latest/modules/client.html#telethon.client.${ns}.${friendly}"><code>client.${friendly}()</code></a> to learn about the parameters and see several code examples on how to use it.`
                );
                docs.writeText(
                    'The method above is the recommended way to do it. If you need more control over the parameters or want to learn how it is implemented, open the details by clicking on the "Details" text.'
                );
                docs.write('<details>');
            }

            docs.write(`<pre><strong>const</strong> { TelegramClient } <strong>=</strong> require('gramjs');
<strong>const</strong> { functions, types } <strong>=</strong> require('gramjs/tl');

(<strong>async</strong> () => {
    <strong>const</strong> client <strong>=</strong> <strong>new</strong> TelegramClient(name, apiId, apiHash);
    await client.start();

    <strong>const</strong> result <strong>= await</strong> client.invoke(`);
            tlobject.asExample(docs, 1);
            docs.write(');\n');

            if (tlobject.result.startsWith('Vector')) {
                docs.write(
                    `<strong>for</strong> x <strong>in</strong> result:
        print(x`
                );
            } else {
                docs.write('    console.log(result');
                if (
                    tlobject.result !== 'Bool' &&
                    !tlobject.result.startsWith('Vector')
                ) {
                    docs.write('.stringify()');
                }
            }

            docs.write(');\n})();</pre>');
            if (tlobject.friendly) {
                docs.write('</details>');
            }

            const depth = '../'.repeat(tlobject.namespace ? 2 : 1);
            docs.addScript(`prependPath = "${depth}";`);
            docs.addScript(null, paths['search.js']);
            docs.endBody();
        }

        docs.close();
    }

    // Find all the available types (which are not the same as the constructors)
    // Each type has a list of constructors associated to it, hence is a map
    for (const [t, cs] of Object.entries(typeToConstructors)) {
        const filename = getPathForType(t);
        const outDir = path.join(filename, '..');

        if (outDir) {
            mkdir(outDir);
        }

        // Since we don't have access to the full TLObject, split the type
        let name = t;

        if (t.includes('.')) {
            [, name] = t.split('.');
        }

        const docs = new DocsWriter(filename, getPathForType).open();

        docs.writeHead(snakeToCamelCase(name), paths.css, paths.defaultCss);
        docs.setMenuSeparator(paths.arrow);
        buildMenu(docs);

        // Main file title
        docs.writeTitle(snakeToCamelCase(name));

        // List available constructors for this type
        docs.writeTitle('Available constructors', 3);
        if (!cs.length) {
            docs.writeText('This type has no constructors available.');
        } else if (cs.length === 1) {
            docs.writeText('This type has one constructor available.');
        } else {
            docs.writeText(
                `This type has ${cs.length} constructors available.`
            );
        }

        docs.beginTable(2);

        for (const constructor of cs) {
            // Constructor full name
            const link = getPathFor(constructor);
            docs.addRow(constructor.className, link);
        }

        docs.endTable();

        // List all the methods which return this type
        docs.writeTitle('Methods returning this type', 3);
        const functions = typeToFunctions[t] || [];

        if (!functions.length) {
            docs.writeText('No method returns this type.');
        } else if (functions.length === 1) {
            docs.writeText('Only the following method returns this type.');
        } else {
            docs.writeText(
                `The following ${functions.length} methods return this type as a result.`
            );
        }

        docs.beginTable(2);

        for (const func of functions) {
            const link = getPathFor(func);
            docs.addRow(func.className, link);
        }

        docs.endTable();

        // List all the methods which take this type as input
        docs.writeTitle('Methods accepting this type as input', 3);
        const otherMethods = tlobjects
            .filter((u) => u.isFunction && u.args.some((a) => a.type === t))
            .sort((x, y) => x.name.localeCompare(y.name));

        if (!otherMethods.length) {
            docs.writeText(
                'No methods accept this type as an input parameter.'
            );
        } else if (otherMethods.length === 1) {
            docs.writeText('Only this method has a parameter with this type.');
        } else {
            docs.writeText(
                `The following ${otherMethods.length} methods accept this type as an input parameter.`
            );
        }

        docs.beginTable(2);

        for (const ot of otherMethods) {
            const link = getPathFor(ot);
            docs.addRow(ot.className, link);
        }

        docs.endTable();

        // List every other type which has this type as a member
        docs.writeTitle('Other types containing this type', 3);
        const otherTypes = tlobjects
            .filter((u) => !u.isFunction && u.args.some((a) => a.type === t))
            .sort((x, y) => x.name.localeCompare(y.name));

        if (!otherTypes.length) {
            docs.writeText('No other types have a member of this type.');
        } else if (otherTypes.length === 1) {
            docs.writeText(
                'You can find this type as a member of this other type.'
            );
        } else {
            docs.writeText(
                `You can find this type as a member of any of the following ${otherTypes.length} types.`
            );
        }

        docs.beginTable(2);

        for (const ot of otherTypes) {
            const link = getPathFor(ot);
            docs.addRow(ot.className, link);
        }

        docs.endTable();
        docs.endBody();
        docs.close();
    }

    // After everything's been written, generate an index.html per folder.
    // This will be done automatically and not taking into account any extra
    // information that we have available, simply a file listing all the others
    // accessible by clicking on their title
    for (const folder of ['types', 'methods', 'constructors']) {
        generateIndex(folder, paths);
    }

    generateIndex('methods', paths, true, botDocsPath);

    // Write the final core index, the main index for the rest of files
    const types = new Set();
    const methods_ = [];
    const cs = [];

    for (const tlobject of tlobjects) {
        if (tlobject.isFunction) {
            methods_.push(tlobject);
        } else {
            cs.push(tlobject);
        }

        if (!CORE_TYPES.has(tlobject.result.toLowerCase())) {
            if (/^vector</i.test(tlobject.result)) {
                types.add(tlobject.innermostResult);
            } else {
                types.add(tlobject.result);
            }
        }
    }

    fs.copyFileSync(`${inputRes}/404.html`, paths['404']);
    copyReplace(`${inputRes}/core.html`, paths.indexAll, {
        typeCount: [...types].length,
        methodCount: methods_.length,
        constructorCount: tlobjects.length - methods_.length,
        layer,
    });

    let fmt = (xs) => {
        const zs = []; // create an object to hold those which have duplicated keys

        for (const x of xs) {
            zs[x.className] = x.className in zs;
        }

        return xs
            .map((x) =>
                zs[x.className] && x.namespace ?
                    `"${x.namespace}.${x.className}"` :
                    `"${x.className}"`
            )
            .join(', ');
    };

    const requestNames = fmt(methods_);
    const constructorNames = fmt(cs);

    fmt = (xs, formatter) => {
        return xs
            .map(
                (x) =>
                    `"${formatter(x).replace(
                        new RegExp(`\\${path.sep}`, 'g'),
                        '/'
                    )}"`
            )
            .join(', ');
    };

    const typeNames = fmt([...types], (x) => x);

    const requestUrls = fmt(methods_, getPathFor);
    const typeUrls = fmt([...types], getPathForType);
    const constructorUrls = fmt(cs, getPathFor);

    mkdir(path.join(paths['search.js'], '..'));
    copyReplace(`${inputRes}/js/search.js`, paths['search.js'], {
        requestNames,
        typeNames,
        constructorNames,
        requestUrls,
        typeUrls,
        constructorUrls,
    });
};

const copyResources = (resDir) => {
    for (const [dirname, files] of [
        ['css', ['docs.light.css', 'docs.dark.css']],
        ['img', ['arrow.svg']],
    ]) {
        mkdir(dirname);

        for (const file of files) {
            fs.copyFileSync(
                `${resDir}/${dirname}/${file}`,
                `${dirname}/${file}`
            );
        }
    }
};

/**
 * Pre-create the required directory structure.
 */
const createStructure = (tlobjects) => {
    const typeNs = new Set();
    const methodsNs = new Set();

    for (const obj of tlobjects) {
        if (obj.namespace) {
            if (obj.isFunction) {
                methodsNs.add(obj.namespace);
            } else {
                typeNs.add(obj.namespace);
            }
        }
    }

    const outputDir = '.';
    const typeDir = `${outputDir}/types`;
    mkdir(typeDir);

    const consDir = `${outputDir}/constructors`;
    mkdir(consDir);

    for (const ns of typeNs) {
        mkdir(`${typeDir}/${ns}`);
        mkdir(`${consDir}/${ns}`);
    }

    const methDir = `${outputDir}/methods`;
    mkdir(methDir);

    for (const ns of typeNs) {
        mkdir(`${methDir}/${ns}`);
    }
};

const generateDocs = (tlobjects, methodsInfo, layer, inputRes) => {
    createStructure(tlobjects);
    writeHtmlPages(tlobjects, methodsInfo, layer, inputRes);
    copyResources(inputRes);
};

module.exports = {
    generateDocs,
};
