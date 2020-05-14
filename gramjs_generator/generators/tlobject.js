const fs = require('fs')
const util = require('util')
const { crc32 } = require('crc')
const SourceBuilder = require('../sourcebuilder')
const { snakeToCamelCase, variableSnakeToCamelCase } = require('../utils')

const AUTO_GEN_NOTICE = '/*! File generated by TLObjects\' generator. All changes will be ERASED !*/'

const AUTO_CASTS = {
    InputPeer: 'utils.getInputPeer(await client.getInputEntity(%s))',
    InputChannel: 'utils.getInputChannel(await client.getInputEntity(%s))',
    InputUser: 'utils.getInputUser(await client.getInputEntity(%s))',
    InputDialogPeer: 'await client._getInputDialog(%s)',
    InputNotifyPeer: 'await client._getInputNotify(%s)',
    InputMedia: 'utils.getInputMedia(%s)',
    InputPhoto: 'utils.getInputPhoto(%s)',
    InputMessage: 'utils.getInputMessage(%s)',
    InputDocument: 'utils.getInputDocument(%s)',
    InputChatPhoto: 'utils.getInputChatPhoto(%s)',
}

const NAMED_AUTO_CASTS = {
    'chatId,int': 'await client.getPeerId(%s, add_mark=False)',
}

// Secret chats have a chat_id which may be negative.
// With the named auto-cast above, we would break it.
// However there are plenty of other legit requests
// with `chat_id:int` where it is useful.
//
// NOTE: This works because the auto-cast is not recursive.
//       There are plenty of types that would break if we
//       did recurse into them to resolve them.
const NAMED_BLACKLIST = new Set(['messages.discardEncryption'])

// const BASE_TYPES = ['string', 'bytes', 'int', 'long', 'int128', 'int256', 'double', 'Bool', 'true'];

// Patched types {fullname: custom.ns.Name}

// No patches currently

const PATCHED_TYPES = {
    messageEmpty: 'Message',
    message: 'Message',
    messageService: 'Message',
}

const writeModules = (outDir, depth, kind, namespaceTlobjects, typeConstructors) => {
    // namespace_tlobjects: {'namespace', [TLObject]}
    fs.mkdirSync(outDir, { recursive: true })

    for (const [ns, tlobjects] of Object.entries(namespaceTlobjects)) {
        const file = `${outDir}/${ns === 'null' ? 'index' : ns}.js`
        const stream = fs.createWriteStream(file)
        const builder = new SourceBuilder(stream)
        const dotDepth = '.'.repeat(depth || 1)

        builder.writeln(AUTO_GEN_NOTICE)
        builder.writeln(`const { TLObject } = require('${dotDepth}/tlobject');`)

        if (kind !== 'TLObject') {
            builder.writeln(`const { ${kind} } = require('${dotDepth}/tlobject');`)
        }

        // Add the relative imports to the namespaces,
        // unless we already are in a namespace.
        if (!ns) {
            const imports = Object.keys(namespaceTlobjects)
                .filter(Boolean)
                .join(', ')

            builder.writeln(`const { ${imports} } = require('.');`)
        }

        // Import struct for the .__bytes__(self) serialization
        builder.writeln('const struct = require(\'python-struct\');')
        builder.writeln(`const { readBigIntFromBuffer, 
        readBufferFromBigInt, generateRandomBytes } = require('../../Helpers')`)

        const typeNames = new Set()
        const typeDefs = []
        /*
        // Find all the types in this file and generate type definitions
        // based on the types. The type definitions are written to the
        // file at the end.
        for (const t of tlobjects) {
            if (!t.isFunction) {
                let typeName = t.result;

                if (typeName.includes('.')) {
                    typeName = typeName.slice(typeName.lastIndexOf('.'));
                }

                if (typeNames.has(typeName)) {
                    continue;
                }

                typeNames.add(typeName);

                const constructors = typeConstructors[typeName];

                if (!constructors) {
                } else if (constructors.length === 1) {
                    typeDefs.push(
                        `Type${typeName} = ${constructors[0].className}`
                    );
                } else {
                    typeDefs.push(
                        `Type${typeName} = Union[${constructors
                            .map(x => constructors.className)
                            .join(',')}]`
                    );
                }
            }
        }*/

        const imports = {}
        const primitives = new Set(['int', 'long', 'int128', 'int256', 'double', 'string', 'bytes', 'Bool', 'true'])

        // Find all the types in other files that are used in this file
        // and generate the information required to import those types.
        for (const t of tlobjects) {
            for (const arg of t.args) {
                let name = arg.type

                if (!name || primitives.has(name)) {
                    continue
                }

                let importSpace = `${dotDepth}/tl/types`

                if (name.includes('.')) {
                    const [namespace] = name.split('.')
                    name = name.split('.')
                    importSpace += `/${namespace}`
                }

                if (!typeNames.has(name)) {
                    typeNames.add(name)

                    if (name === 'date') {
                        imports.datetime = ['datetime']
                        continue
                    } else if (!(importSpace in imports)) {
                        imports[importSpace] = new Set()
                    }

                    imports[importSpace].add(`Type${name}`)
                }
            }
        }

        // Add imports required for type checking
        /**
         if (imports) {
            builder.writeln('if (false) { // TYPE_CHECKING {');

            for (const [namespace, names] of Object.entries(imports)) {
                builder.writeln(
                    `const { ${[...names.values()].join(
                        ', '
                    )} } =  require('${namespace}');`
                );
            }

            builder.endBlock();
        }*/

        // Generate the class for every TLObject
        for (const t of tlobjects) {
            if (t.fullname in PATCHED_TYPES) {
                builder.writeln(`const ${t.className} = null; // Patched`)
            } else {
                writeSourceCode(t, kind, builder, typeConstructors)
                builder.currentIndent = 0
            }
        }

        // Write the type definitions generated earlier.
        builder.writeln()

        for (const line of typeDefs) {
            builder.writeln(line)
        }
        writeModuleExports(tlobjects, builder)
        if (file.indexOf('index.js') > 0) {
            for (const [ns] of Object.entries(namespaceTlobjects)) {
                if (ns !== 'null') {
                    builder.writeln('let %s = require(\'./%s\');', ns, ns)
                }
            }
            for (const [ns] of Object.entries(namespaceTlobjects)) {
                if (ns !== 'null') {
                    builder.writeln('module.exports.%s = %s;', ns, ns)
                }
            }
        }
    }
}

const writeReadResult = (tlobject, builder) => {
    // Only requests can have a different response that's not their
    // serialized body, that is, we'll be setting their .result.
    //
    // The default behaviour is reading a TLObject too, so no need
    // to override it unless necessary.
    if (!tlobject.isFunction) {
        return
    }

    // https://core.telegram.org/mtproto/serialize#boxed-and-bare-types
    // TL;DR; boxed types start with uppercase always, so we can use
    // this to check whether everything in it is boxed or not.
    //
    // Currently only un-boxed responses are Vector<int>/Vector<long>.
    // If this weren't the case, we should check upper case after
    // max(index('<'), index('.')) (and if it is, it's boxed, so return).
    const m = tlobject.result.match(/Vector<(int|long)>/)
    if (!m) {
        return
    }

    // builder.endBlock();
    builder.writeln('readResult(reader){')
    builder.writeln('reader.readInt();  // Vector ID')
    builder.writeln('let temp = [];')
    builder.writeln('let len = reader.readInt(); //fix this')
    builder.writeln('for (let i=0;i<len;i++){')
    const read = m[1][0].toUpperCase() + m[1].slice(1)
    builder.writeln('temp.push(reader.read%s())', read)
    builder.endBlock()
    builder.writeln('return temp')
    builder.endBlock()
}

/**
 * Writes the source code corresponding to the given TLObject
 * by making use of the ``builder`` `SourceBuilder`.
 *
 * Additional information such as file path depth and
 * the ``Type: [Constructors]`` must be given for proper
 * importing and documentation strings.
 */
const writeSourceCode = (tlobject, kind, builder, typeConstructors) => {
    writeClassConstructor(tlobject, kind, typeConstructors, builder)
    writeResolve(tlobject, builder)
    // writeToJson(tlobject, builder);
    writeToBytes(tlobject, builder)
    builder.currentIndent--
    writeFromReader(tlobject, builder)
    writeReadResult(tlobject, builder)
    builder.currentIndent--
    builder.writeln('}')
}

const writeClassConstructor = (tlobject, kind, typeConstructors, builder) => {
    builder.writeln()
    builder.writeln()
    builder.writeln(`class ${tlobject.className} extends ${kind} {`)
    builder.writeln(`static CONSTRUCTOR_ID = 0x${tlobject.id.toString(16).padStart(8, '0')};`)
    builder.writeln(`static SUBCLASS_OF_ID = 0x${crc32(tlobject.result).toString(16)};`)
    builder.writeln()
    // Write the __init__ function if it has any argument
    if (!tlobject.realArgs.length) {
        builder.writeln('constructor() {')
        builder.writeln('super();')
        builder.writeln(`this.CONSTRUCTOR_ID = 0x${tlobject.id.toString(16).padStart(8, '0')};`)
        builder.writeln(`this.SUBCLASS_OF_ID = 0x${crc32(tlobject.result).toString(16)};`)

        builder.writeln()
        builder.currentIndent--
        builder.writeln('}')
        return
    }

    // Note : this is needed to be able to access them
    // with or without an instance


    builder.writeln('/**')

    if (tlobject.isFunction) {
        builder.write(`:returns ${tlobject.result}: `)
    } else {
        builder.write(`Constructor for ${tlobject.result}: `)
    }

    const constructors = typeConstructors[tlobject.result]

    if (!constructors) {
        builder.writeln('This type has no constructors.')
    } else if (constructors.length === 1) {
        builder.writeln(`Instance of ${constructors[0].className}`)
    } else {
        builder.writeln(`Instance of either ${constructors.map(c => c.className).join(', ')}`)
    }

    builder.writeln('*/')
    builder.writeln('constructor(args) {')
    builder.writeln('super();')
    builder.writeln('args = args || {}')
    // Class-level variable to store its Telegram's constructor ID
    builder.writeln(`this.CONSTRUCTOR_ID = 0x${tlobject.id.toString(16).padStart(8, '0')};`)
    builder.writeln(`this.SUBCLASS_OF_ID = 0x${crc32(tlobject.result).toString(16)};`)

    builder.writeln()

    // Set the arguments
    for (const arg of tlobject.realArgs) {
        if (!arg.canBeInferred) {
            const argname = variableSnakeToCamelCase(arg.name)
            let code = `this.${argname} = `

            if (arg.isVector) {
                code += `args.${argname} && args.${argname}.length > 0 ? args.${argname} : null`
            } else {
                code += `args.${argname}${arg.isFlag || arg.canBeInferred ? '|| null' : ''}`
            }

            builder.writeln(code)

            // Currently the only argument that can be
            // inferred are those called 'random_id'
        } else if (arg.name === 'random_id') {
            // Endianness doesn't really matter, and 'big' is shorter
            let code = `readBigIntFromBuffer(generateRandomBytes(${
                arg.type === 'long' ? 8 : 4
            }),false,true)`

            if (arg.isVector) {
                // Currently for the case of "messages.forwardMessages"
                // Ensure we can infer the length from id:Vector<>
                if (!tlobject.realArgs.find(a => a.name === 'id').isVector) {
                    throw new Error(`Cannot infer list of random ids for ${tlobject}`)
                }

                code = `new Array(id.length).fill().map(_ => ${code})`
            }

            builder.writeln(`this.randomId = args.randomId !== undefined ? args.randomId : ${code};`)
        } else {
            throw new Error(`Cannot infer a value for ${arg}`)
        }
    }

    builder.endBlock()
}

const writeResolve = (tlobject, builder) => {
    if (
        tlobject.isFunction &&
        tlobject.realArgs.some(
            arg =>
                arg.type in AUTO_CASTS ||
                (`${arg.name},${arg.type}` in NAMED_AUTO_CASTS && !NAMED_BLACKLIST.has(tlobject.fullname)),
        )
    ) {
        builder.writeln('async resolve(client, utils) {')

        for (const arg of tlobject.realArgs) {
            let ac = AUTO_CASTS[arg.type]

            if (!ac) {
                ac = NAMED_AUTO_CASTS[`${variableSnakeToCamelCase(arg.name)},${arg.type}`]

                if (!ac) {
                    continue
                }
            }

            if (arg.isFlag) {
                builder.writeln(`if (this.${variableSnakeToCamelCase(arg.name)}) {`)
            }

            if (arg.isVector) {
                builder.write('const _tmp = [];')
                builder.writeln(`for (const _x of this.${variableSnakeToCamelCase(arg.name)}) {`)
                builder.writeln('_tmp.push(%s);', util.format(ac, '_x'))
                builder.endBlock()
                builder.writeln(`this.${variableSnakeToCamelCase(arg.name)} = _tmp;`)
            } else {
                builder.writeln(`this.${arg.name} = %s`,
                    util.format(ac, `this.${variableSnakeToCamelCase(arg.name)}`))
            }

            if (arg.isFlag) {
                builder.currentIndent--
                builder.writeln('}')
            }
        }

        builder.endBlock()
    }
}
/**
 const writeToJson = (tlobject, builder) => {
    builder.writeln('toJson() {');
    builder.writeln('return {');

    builder.write("_: '%s'", tlobject.className);

    for (const arg of tlobject.realArgs) {
        builder.writeln(',');
        builder.write('%s: ', arg.name);

        if (BASE_TYPES.includes(arg.type)) {
            if (arg.isVector) {
                builder.write(
                    'this.%s === null ? [] : this.%s.slice()',
                    arg.name,
                    arg.name
                );
            } else {
                builder.write('this.%s', arg.name);
            }
        } else {
            if (arg.isVector) {
                builder.write(
                    'this.%s === null ? [] : this.%s.map(x => x instanceof TLObject ? x.toJson() : x)',
                    arg.name,
                    arg.name
                );
            } else {
                builder.write(
                    'this.%s instanceof TLObject ? this.%s.toJson() : this.%s',
                    arg.name,
                    arg.name,
                    arg.name
                );
            }
        }
    }

    builder.writeln();
    builder.endBlock();
    builder.currentIndent--;
    builder.writeln('}');
};
 */
const writeToBytes = (tlobject, builder) => {
    builder.writeln('getBytes() {')

    // Some objects require more than one flag parameter to be set
    // at the same time. In this case, add an assertion.
    const repeatedArgs = {}
    for (const arg of tlobject.args) {
        if (arg.isFlag) {
            if (!repeatedArgs[arg.flagIndex]) {
                repeatedArgs[arg.flagIndex] = []
            }
            repeatedArgs[arg.flagIndex].push(arg)
        }
    }

    for (const ra of Object.values(repeatedArgs)) {
        if (ra.length > 1) {
            const cnd1 = []
            const cnd2 = []
            const names = []

            for (const a of ra) {
                cnd1.push(`this.${a.name} || this.${a.name}!==null`)
                cnd2.push(`this.${a.name}===null || this.${a.name}===false`)
                names.push(a.name)
            }
            builder.writeln(
                'if (!((%s) && (%s)))\n\t throw new Error(\'%s paramaters must all be false-y or all true\')',
                cnd1.join(' && '),
                cnd2.join(' && '),
                names.join(', '),
            )
        }
    }
    builder.writeln('return Buffer.concat([')
    builder.currentIndent++
    const b = Buffer.alloc(4)
    b.writeUInt32LE(tlobject.id, 0)
    // First constructor code, we already know its bytes
    builder.writeln('Buffer.from("%s","hex"),', b.toString('hex'))
    for (const arg of tlobject.args) {
        if (writeArgToBytes(builder, arg, tlobject.args)) {
            builder.writeln(',')
        }
    }
    builder.writeln('])')
    builder.endBlock()
}

// writeFromReader
const writeFromReader = (tlobject, builder) => {
    builder.writeln('static fromReader(reader) {')
    for (const arg of tlobject.args) {
        if (arg.name !== 'flag') {
            if (arg.name !== 'x') {
                builder.writeln('let %s', '_' + arg.name + ';')
            }
        }
    }

    // TODO fix this really
    builder.writeln('let _x;')
    builder.writeln('let len;')

    for (const arg of tlobject.args) {
        writeArgReadCode(builder, arg, tlobject.args, '_' + arg.name)
    }
    const temp = []
    for (const a of tlobject.realArgs) {
        temp.push(`${variableSnakeToCamelCase(a.name)}:_${a.name}`)
    }
    builder.writeln('return new this({%s})', temp.join(',\n\t'))
    builder.endBlock()
}
// writeReadResult

/**
 * Writes the .__bytes__() code for the given argument
 * @param builder: The source code builder
 * @param arg: The argument to write
 * @param args: All the other arguments in TLObject same __bytes__.
 *              This is required to determine the flags value
 * @param name: The name of the argument. Defaults to "self.argname"
 *              This argument is an option because it's required when
 *              writing Vectors<>
 */
const writeArgToBytes = (builder, arg, args, name = null) => {
    if (arg.genericDefinition) {
        return // Do nothing, this only specifies a later type
    }

    if (name === null) {
        name = `this.${arg.name}`
    }

    name = variableSnakeToCamelCase(name)
    // The argument may be a flag, only write if it's not None AND
    // if it's not a True type.
    // True types are not actually sent, but instead only used to
    // determine the flags.
    if (arg.isFlag) {
        if (arg.type === 'true') {
            return // Exit, since true type is never written
        } else if (arg.isVector) {
            // Vector flags are special since they consist of 3 values,
            // so we need an extra join here. Note that empty vector flags
            // should NOT be sent either!
            builder.write(
                '(%s === undefined || %s === false || %s ===null) ? Buffer.alloc(0) :Buffer.concat([',
                name,
                name,
                name,
            )
        } else {
            builder.write('(%s === undefined || %s === false || %s ===null) ? Buffer.alloc(0) : [', name, name, name)
        }
    }

    if (arg.isVector) {
        if (arg.useVectorId) {
            builder.write('Buffer.from(\'15c4b51c\', \'hex\'),')
        }

        builder.write('struct.pack(\'<i\', %s.length),', name)

        // Cannot unpack the values for the outer tuple through *[(
        // since that's a Python >3.5 feature, so add another join.
        builder.write('Buffer.concat(%s.map(x => ', name)
        // Temporary disable .is_vector, not to enter this if again
        // Also disable .is_flag since it's not needed per element
        const oldFlag = arg.isFlag
        arg.isVector = arg.isFlag = false
        writeArgToBytes(builder, arg, args, 'x')
        arg.isVector = true
        arg.isFlag = oldFlag

        builder.write('))')
    } else if (arg.flagIndicator) {
        // Calculate the flags with those items which are not None
        if (!args.some(f => f.isFlag)) {
            // There's a flag indicator, but no flag arguments so it's 0
            builder.write('Buffer.alloc(4)')
        } else {
            builder.write('struct.pack(\'<I\', ')
            builder.write(
                args
                    .filter(flag => flag.isFlag)
                    .map(
                        flag =>
                            `(this.${variableSnakeToCamelCase(
                                flag.name,
                            )} === undefined || this.${variableSnakeToCamelCase(
                                flag.name,
                            )} === false || this.${variableSnakeToCamelCase(flag.name)} === null) ? 0 : ${1 <<
                            flag.flagIndex}`,
                    )
                    .join(' | '),
            )
            builder.write(')')
        }
    } else if (arg.type === 'int') {
        builder.write('struct.pack(\'<i\', %s)', name)
    } else if (arg.type === 'long') {
        builder.write('readBufferFromBigInt(%s,8,true,true)', name)
    } else if (arg.type === 'int128') {
        builder.write('readBufferFromBigInt(%s,16,true,true)', name)
    } else if (arg.type === 'int256') {
        builder.write('readBufferFromBigInt(%s,32,true,true)', name)
    } else if (arg.type === 'double') {
        builder.write('struct.pack(\'<d\', %s.toString())', name)
    } else if (arg.type === 'string') {
        builder.write('TLObject.serializeBytes(%s)', name)
    } else if (arg.type === 'Bool') {
        builder.write('%s ? 0xb5757299 : 0x379779bc', name)
    } else if (arg.type === 'true') {
        // These are actually NOT written! Only used for flags
    } else if (arg.type === 'bytes') {
        builder.write('TLObject.serializeBytes(%s)', name)
    } else if (arg.type === 'date') {
        builder.write('TLObject.serializeDatetime(%s)', name)
    } else {
        // Else it may be a custom type
        builder.write('%s.getBytes()', name)

        // If the type is not boxed (i.e. starts with lowercase) we should
        // not serialize the constructor ID (so remove its first 4 bytes).
        let boxed = arg.type.charAt(arg.type.indexOf('.') + 1)
        boxed = boxed === boxed.toUpperCase()

        if (!boxed) {
            builder.write('.slice(4)')
        }
    }

    if (arg.isFlag) {
        builder.write(']')

        if (arg.isVector) {
            builder.write(')')
        }
    }

    return true
}

/**
 * Writes the read code for the given argument, setting the
 * arg.name variable to its read value.
 * @param builder The source code builder
 * @param arg The argument to write
 * @param args All the other arguments in TLObject same on_send.
 * This is required to determine the flags value
 * @param name The name of the argument. Defaults to "self.argname"
 * This argument is an option because it's required when
 * writing Vectors<>
 */
const writeArgReadCode = (builder, arg, args, name) => {
    if (arg.genericDefinition) {
        return // Do nothing, this only specifies a later type
    }
    // The argument may be a flag, only write that flag was given!
    let wasFlag = false
    if (arg.isFlag) {
        // Treat 'true' flags as a special case, since they're true if
        // they're set, and nothing else needs to actually be read.
        if (arg.type === 'true') {
            builder.writeln('%s = Boolean(flags & %s);', name, 1 << arg.flagIndex)
            return
        }

        wasFlag = true
        builder.writeln('if (flags & %s) {', 1 << arg.flagIndex)
        // Temporary disable .is_flag not to enter this if
        // again when calling the method recursively
        arg.isFlag = false
    }

    if (arg.isVector) {
        if (arg.useVectorId) {
            // We have to read the vector's constructor ID
            builder.writeln('reader.readInt();')
        }

        builder.writeln('%s = [];', name)
        builder.writeln('len = reader.readInt();')
        builder.writeln('for (let i=0;i<len;i++){')

        // Temporary disable .is_vector, not to enter this if again
        arg.isVector = false
        writeArgReadCode(builder, arg, args, '_x')
        builder.writeln('%s.push(_x);', name)
        arg.isVector = true
    } else if (arg.flagIndicator) {
        // Read the flags, which will indicate what items we should read next
        builder.writeln('let flags = reader.readInt();')
        builder.writeln()
    } else if (arg.type === 'int') {
        builder.writeln('%s = reader.readInt();', name)
    } else if (arg.type === 'long') {
        builder.writeln('%s = reader.readLong();', name)
    } else if (arg.type === 'int128') {
        builder.writeln('%s = reader.readLargeInt(128);', name)
    } else if (arg.type === 'int256') {
        builder.writeln('%s = reader.readLargeInt(256);', name)
    } else if (arg.type === 'double') {
        builder.writeln('%s = reader.readDouble();', name)
    } else if (arg.type === 'string') {
        builder.writeln('%s = reader.tgReadString();', name)
    } else if (arg.type === 'Bool') {
        builder.writeln('%s = reader.tgReadBool();', name)
    } else if (arg.type === 'true') {
        builder.writeln('%s = true;', name)
    } else if (arg.type === 'bytes') {
        builder.writeln('%s = reader.tgReadBytes();', name)
    } else if (arg.type === 'date') {
        builder.writeln('%s = reader.tgReadDate();', name)
    } else {
        // Else it may be a custom type
        if (!arg.skipConstructorId) {
            builder.writeln('%s = reader.tgReadObject();', name)
        } else {
            // Import the correct type inline to avoid cyclic imports.
            // There may be better solutions so that we can just access
            // all the types before the files have been parsed, but I
            // don't know of any.
            const sepIndex = arg.type.indexOf('.')
            let ns
            let t

            if (sepIndex === -1) {
                ns = '.'
                t = arg.type
            } else {
                ns = '.' + arg.type.slice(0, sepIndex)
                t = arg.type.slice(sepIndex + 1)
            }

            const className = snakeToCamelCase(t)

            // There would be no need to import the type if we're in the
            // file with the same namespace, but since it does no harm
            // and we don't have information about such thing in the
            // method we just ignore that case.
            builder.writeln('let %s = require("%s");', className, ns)
            builder.writeln('%s = %s.fromReader(reader);', name, className)
        }
    }

    // End vector and flag blocks if required (if we opened them before)
    if (arg.isVector) {
        builder.writeln('}')
    }

    if (wasFlag) {
        builder.endBlock()
        builder.writeln('else {')
        builder.writeln('%s = null', name)
        builder.endBlock()
        // Restore .isFlag;
        arg.isFlag = true
    }
}

const writePatched = (outDir, namespaceTlobjects) => {
    fs.mkdirSync(outDir, { recursive: true })

    for (const [ns, tlobjects] of Object.entries(namespaceTlobjects)) {
        const file = `${outDir}/${ns === 'null' ? 'index' : ns}.js`
        const stream = fs.createWriteStream(file)
        const builder = new SourceBuilder(stream)

        builder.writeln(AUTO_GEN_NOTICE)
        builder.writeln('const struct = require(\'python-struct\');')
        builder.writeln('const { TLObject } = require(\'../tlobject\');')
        builder.writeln('const types = require(\'../types\');')
        builder.writeln('const custom = require(\'../custom\');')

        builder.writeln()

        for (const t of tlobjects) {
            builder.writeln('class %s extends custom.%s {', t.className, PATCHED_TYPES[t.fullname])
            builder.writeln(`static CONSTRUCTOR_ID = 0x${t.id.toString(16)}`)
            builder.writeln(`static SUBCLASS_OF_ID = 0x${crc32(t.result).toString('16')}`)
            builder.writeln()
            builder.writeln('constructor(args) {')
            builder.writeln('super(args);')
            builder.writeln(`this.CONSTRUCTOR_ID = 0x${t.id.toString(16)}`)
            builder.writeln(`this.SUBCLASS_OF_ID = 0x${crc32(t.result).toString('16')}`)

            builder.endBlock()

            // writeToJson(t, builder);
            writeToBytes(t, builder)
            writeFromReader(t, builder)

            builder.writeln()
            builder.endBlock()
            builder.currentIndent = 0
            builder.writeln('exports.%s%s = %s', t.namespace ? `${t.namespace}.` : '', t.className, t.className)
            builder.writeln()
        }
    }
}

const writeAllTLObjects = (tlobjects, layer, builder) => {
    builder.writeln(AUTO_GEN_NOTICE)
    builder.writeln()

    builder.writeln('const { types, functions, patched } = require(\'.\');')
    builder.writeln()

    // Create a constant variable to indicate which layer this is
    builder.writeln('const LAYER = %s;', layer)
    builder.writeln()

    // Then create the dictionary containing constructor_id: class
    builder.writeln('const tlobjects = {')

    // Fill the dictionary (0x1a2b3c4f: tl.full.type.path.Class)
    for (const tlobject of tlobjects) {
        builder.write('0x0%s: ', tlobject.id.toString(16).padStart(8, '0'))

        if (tlobject.fullname in PATCHED_TYPES) {
            builder.write('patched')
        } else {
            builder.write(tlobject.isFunction ? 'functions' : 'types')
        }

        if (tlobject.namespace) {
            builder.write('.%s', tlobject.namespace)
        }

        builder.writeln('.%s,', tlobject.className)
    }

    builder.endBlock(true)
    builder.writeln('')
    builder.writeln('module.exports = {')
    builder.writeln('LAYER,')
    builder.writeln('tlobjects')
    builder.endBlock(true)
}

const generateTLObjects = (tlobjects, layer, importDepth, outputDir) => {
    // Group everything by {namespace :[tlobjects]} to generate index.js
    const namespaceFunctions = {}
    const namespaceTypes = {}
    const namespacePatched = {}

    // Group {type: [constructors]} to generate the documentation
    const typeConstructors = {}

    for (const tlobject of tlobjects) {
        if (tlobject.isFunction) {
            if (!namespaceFunctions[tlobject.namespace]) {
                namespaceFunctions[tlobject.namespace] = []
            }

            namespaceFunctions[tlobject.namespace].push(tlobject)
        } else {
            if (!namespaceTypes[tlobject.namespace]) {
                namespaceTypes[tlobject.namespace] = []
            }

            if (!typeConstructors[tlobject.result]) {
                typeConstructors[tlobject.result] = []
            }

            namespaceTypes[tlobject.namespace].push(tlobject)
            typeConstructors[tlobject.result].push(tlobject)

            if (tlobject.fullname in PATCHED_TYPES) {
                if (!namespacePatched[tlobject.namespace]) {
                    namespacePatched[tlobject.namespace] = []
                }

                namespacePatched[tlobject.namespace].push(tlobject)
            }
        }
    }

    writeModules(`${outputDir}/functions`, importDepth, 'TLRequest', namespaceFunctions, typeConstructors)
    writeModules(`${outputDir}/types`, importDepth, 'TLObject', namespaceTypes, typeConstructors)
    writePatched(`${outputDir}/patched`, namespacePatched)

    const filename = `${outputDir}/AllTLObjects.js`
    const stream = fs.createWriteStream(filename)
    const builder = new SourceBuilder(stream)

    writeAllTLObjects(tlobjects, layer, builder)
}

const cleanTLObjects = outputDir => {
    for (let d of ['functions', 'types', 'patched']) {
        d = `${outputDir}/d`

        if (fs.statSync(d).isDirectory()) {
            fs.rmdirSync(d)
        }
    }

    const tl = `${outputDir}/AllTLObjects.js`

    if (fs.statSync(tl).isFile()) {
        fs.unlinkSync(tl)
    }
}

const writeModuleExports = (tlobjects, builder) => {
    builder.writeln('module.exports = {')

    for (const t of tlobjects) {
        builder.writeln(`${t.className},`)
    }

    builder.currentIndent--
    builder.writeln('}\n')
}

module.exports = {
    generateTLObjects,
    cleanTLObjects,
}
