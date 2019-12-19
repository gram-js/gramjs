<<<<<<< HEAD:src/lib/gramjs/tl/gramJsApi.js
//const { readFileSync } = require('fs')
import { readFileSync } from 'fs'


=======
const { readFileSync } = require('fs')
>>>>>>> 1ab480fe... Gram JS: Remove deps; Fix Factorizator and remove leemon lib:src/lib/gramjs/tl/api.js
const {
    parseTl,
    serializeBytes,
    serializeDate
} = require('./generationHelpers')
<<<<<<< HEAD:src/lib/gramjs/tl/gramJsApi.js
=======
const { readBufferFromBigInt,toSignedLittleBuffer } = require('../Helpers')
>>>>>>> 1a0b5c54... GramJS: Fix images loading: add `async-mutex`; Fix signed LE ints; Bring back `readExactly`:src/lib/gramjs/tl/api.js

const NAMED_AUTO_CASTS = new Set([
    'chatId,int'
])
const NAMED_BLACKLIST = new Set([
    'discardEncryption'
])
const AUTO_CASTS = new Set([
    'InputPeer',
    'InputChannel',
    'InputUser',
    'InputDialogPeer',
    'InputNotifyPeer',
    'InputMedia',
    'InputPhoto',
    'InputMessage',
    'InputDocument',
    'InputChatPhoto',
])
const struct = require('python-struct')

const { readBufferFromBigInt } = require('../Helpers')

function buildApiFromTlSchema() {
    const tlContent = readFileSync('./static/api.tl', 'utf-8')
    const [constructorParamsApi, functionParamsApi] = extractParams(tlContent)
    const schemeContent = readFileSync('./static/schema.tl', 'utf-8')
    const [constructorParamsSchema, functionParamsSchema] = extractParams(schemeContent)
    const constructors = [...constructorParamsApi, ...constructorParamsSchema]
    const requests = [...functionParamsApi, ...functionParamsSchema]
    return {
        constructors: createClasses('constructor', constructors),
        requests: createClasses('request', requests),
    }
}


function extractParams(fileContent) {
    const f = parseTl(fileContent, 105)
    const constructors = []
    const functions = []
    for (const d of f) {
        d.isFunction ? functions.push(d) : constructors.push(d)
    }
    return [constructors, functions]
}


function argToBytes(x, type) {
    switch (type) {
        case 'int':
            const i = Buffer.alloc(4)
            return i.writeInt32LE(x, 0)
        case 'long':
            return toSignedLittleBuffer(x, 8)
        case 'int128':
            return toSignedLittleBuffer(x, 16)
        case 'int256':
            return toSignedLittleBuffer(x, 32)
        case 'double':
            const d = Buffer.alloc(8)
            return d.writeDoubleLE(x, 0)
        case 'string':
            return serializeBytes(x)
        case 'Bool':
            return x ? Buffer.from('b5757299', 'hex') : Buffer.from('379779bc', 'hex')
        case 'true':
            return Buffer.alloc(0)
        case 'bytes':
            return serializeBytes(x)
        case 'date':
            return serializeDate(x)
        default:
            throw new Error("unsupported")
    }
}

async function getInputFromResolve(utils, client, peer, peerType) {
    switch (peerType) {
        case 'InputPeer':
            return utils.getInputPeer(await client.getInputEntity(peer))
        case 'InputChannel':
            return utils.getInputChannel(await client.getInputEntity(peer))
        case 'InputUser':
            return utils.getInputUser(await client.getInputEntity(peer))
        case 'InputDialogPeer':
            return await client._getInputDialog(peer)
        case 'InputNotifyPeer':
            return await client._getInputNotify(peer)
        case 'InputMedia':
            return utils.getInputMedia(peer)
        case 'InputPhoto':
            return utils.getInputPhoto(peer)
        case 'InputMessage':
            return utils.getInputMessage(peer)
        case 'InputDocument':
            return utils.getInputDocument(peer)
        case 'InputChatPhoto':
            return utils.getInputChatPhoto(peer)
        case 'chatId,int' :
            return await client.getPeerId(peer, false)
        default:
            throw new Error('unsupported peer type : ' + peerType)

    }

}

function getArgFromReader(reader, arg) {
    if (arg.isVector) {
        if (arg.useVectorId) {
            reader.readInt()
        }
        const temp = []
        const len = reader.readInt()
        arg.isVector = false
        for (let i = 0; i < len; i++) {
            temp.push(getArgFromReader(reader, arg))
        }
        arg.isVector = true
        return temp
    } else if (arg.flagIndicator) {
        return reader.readInt()
    } else {
        switch (arg.type) {
            case 'int':
                return reader.readInt()
            case 'long':
                return reader.readLong()
            case 'int128':
                return reader.readLargeInt(128)
            case 'int256':
                return reader.readLargeInt(256)
            case 'double':
                return reader.readDouble()
            case 'string':
                return reader.tgReadString()
            case 'Bool':
                return reader.tgReadBool()
            case 'true':
                return true
            case 'bytes':
                return reader.tgReadBytes()
            case 'date':
                return reader.tgReadDate()
            default:

                if (!arg.skipConstructorId) {
                    return reader.tgReadObject()
                } else {
                    return gramJsApi.constructors[arg.type].fromReader(reader)
                }
        }
    }

}

function createClasses(classesType, params) {
    const classes = {}
    for (const classParams of params) {
        const { name, constructorId, subclassOfId, argsConfig, namespace ,result} = classParams

        class VirtualClass {
            static CONSTRUCTOR_ID = constructorId
            static SUBCLASS_OF_ID = subclassOfId
            static className = name
            static classType = classesType

            CONSTRUCTOR_ID = constructorId
            SUBCLASS_OF_ID = subclassOfId
            className = name
            classType = classesType

            constructor(args) {
                args = args || {}
                Object.keys(args)
                    .forEach((argName) => {
                        this[argName] = args[argName]
                    })
            }

            static fromReader(reader) {

                const args = {}

                for (const argName in argsConfig) {
                    if (argsConfig.hasOwnProperty(argName)) {
                        const arg = argsConfig[argName]
                        if (arg.isFlag) {
                            if (arg.type === 'true') {
                                args[argName] = Boolean(args['flags'] & 1 << arg.flagIndex)
                                continue
                            }
                            if (args['flags'] & 1 << arg.flagIndex) {
                                args[argName] = getArgFromReader(reader, arg)
                            } else {
                                args[argName] = null
                            }
                        } else {
                            if (arg.flagIndicator) {
                                arg.name = 'flags'
                            }
                            args[argName] = getArgFromReader(reader, arg)
                        }
                    }
                }
                return new VirtualClass(args)
            }

            getBytes() {
                // The next is pseudo-code:
                const idForBytes = this.CONSTRUCTOR_ID
                const c = Buffer.alloc(4)
                c.writeUInt32LE(idForBytes, 0)
                const buffers = [c]
                for (const arg in argsConfig) {
                    if (argsConfig.hasOwnProperty(arg)) {
                        if (argsConfig[arg].isFlag) {
                            const tempBuffers = []
                            if (argsConfig[arg] === 'true') {

                            } else if (argsConfig[arg].isVector) {
                                if (argsConfig[arg].useVectorId) {
                                    tempBuffers.push(Buffer.from('15c4b51c', 'hex'))
                                }
                                const l = Buffer.alloc(4)
                                l.writeInt32LE(this[arg].length, 0)
                                buffers.push((!this[arg] ? Buffer.alloc(0) : Buffer.concat([...tempBuffers,
                                    l, Buffer.concat(this[arg].map(x => argToBytes(x, argsConfig[arg].type)))])))
                            }
                        } else if (argsConfig[arg].isVector && !argsConfig[arg].isFlag) {
                            if (argsConfig[arg].isVector) {
                                buffers.push(Buffer.from('15c4b51c', 'hex'))
                            }
                            const l = Buffer.alloc(4)
                            l.writeInt32LE(this[arg].length, 0)
                            buffers.push(l, Buffer.concat(this[arg].map(x => argToBytes(x, argsConfig[arg].type))))
                        } else if (argsConfig[arg].flagIndicator) {
                            // @ts-ignore
                            if (!Object.values(argsConfig)
                                .some((f) => f.isFlag)) {
                                buffers.push(Buffer.alloc(4))
                            } else {
                                let flagCalculate = 0
                                for (const f of Object.values(argsConfig)) {
                                    if (f.isFlag) {
                                        if (!this[f.name]) {
                                            flagCalculate |= 0
                                        } else {
                                            flagCalculate |= f.flagIndex
                                        }
                                    }
                                }
                                const f = Buffer.alloc(4)
                                f.writeUInt32LE(flagCalculate, 0)
                                buffers.push(f)
                            }
                        } else {

                            switch (argsConfig[arg].type) {
                                case 'int':
                                    const i = Buffer.alloc(4)
                                    i.writeInt32LE(this[arg], 0)
                                    buffers.push(i)
                                    break
                                case 'long':
                                    buffers.push(toSignedLittleBuffer(this[arg], 8))
                                    break
                                case 'int128':
                                    buffers.push(toSignedLittleBuffer(this[arg], 16))
                                    break
                                case 'int256':
                                    buffers.push(toSignedLittleBuffer(this[arg], 32))
                                    break
                                case 'double':
                                    const d = Buffer.alloc(8)
                                    d.writeDoubleLE(this[arg].toString(), 0)
                                    buffers.push(d)
                                    break
                                case 'string':
                                    buffers.push(serializeBytes(this[arg]))
                                    break
                                case 'Bool':
                                    buffers.push(this[arg] ? Buffer.from('b5757299', 'hex') : Buffer.from('379779bc', 'hex'))
                                    break
                                case 'true':
                                    break
                                case 'bytes':
                                    buffers.push(serializeBytes(this[arg]))
                                    break
                                case 'date':
                                    buffers.push(serializeDate(this[arg]))
                                    break
                                default:
                                    buffers.push(this[arg].getBytes())
                                    let boxed = (argsConfig[arg].type.charAt(argsConfig[arg].type.indexOf('.') + 1))
                                    boxed = boxed === boxed.toUpperCase()
                                    if (!boxed) {
                                        buffers.shift()
                                    }
                            }
                        }
                    }

                }
                return Buffer.concat(buffers)
            }

            readResult(reader) {
                if (classesType !== 'request') {
                    throw new Error('`readResult()` called for non-request instance')
                }

                const m = result.match(/Vector<(int|long)>/)
                if (m) {
                    reader.readInt()
                    let temp = []
                    let len = reader.readInt()
                    if (m[1] === 'int') {
                        for (let i = 0; i < len; i++) {
                            temp.push(reader.readInt())
                        }
                    } else {
                        for (let i = 0; i < len; i++) {
                            temp.push(reader.readLong())
                        }
                    }
                    return temp
                } else {
                    return reader.tgReadObject()
                }
            }

            async resolve(client, utils) {
                if (classesType !== 'request') {
                    throw new Error('`resolve()` called for non-request instance')
                }

                for (const arg in argsConfig) {
                    if (argsConfig.hasOwnProperty(arg)) {
                        if (!AUTO_CASTS.has(argsConfig[arg].type)) {
                            if (!NAMED_AUTO_CASTS.has(`${argsConfig[arg].name},${argsConfig[arg].type}`)) {
                                continue
                            }
                        }
                        if (argsConfig[arg].isFlag) {
                            if (!this[arg]) {
                                continue
                            }
                        }
                        if (argsConfig[arg].isVector) {
                            const temp = []
                            for (const x of this[arg]) {
                                temp.push(await getInputFromResolve(utils, client, this[arg], argsConfig[arg].type))
                            }
                            this[arg] = temp
                        } else {
                            this[arg] =await getInputFromResolve(utils, client, this[arg], argsConfig[arg].type)
                        }
                    }
                }
            }
        }

        if (namespace) {
            if (!classes[namespace]) {
                // @ts-ignore
                classes[namespace] = {}
            }
            classes[namespace][name] = VirtualClass

        } else {
            classes[name] = VirtualClass

        }
    }

    return classes
}

<<<<<<< HEAD:src/lib/gramjs/tl/gramJsApi.js
const gramJsApi = buildApiFromTlSchema()
module.exports = gramJsApi
=======
module.exports = buildApiFromTlSchema()
console.log(module.exports)
>>>>>>> 1ab480fe... Gram JS: Remove deps; Fix Factorizator and remove leemon lib:src/lib/gramjs/tl/api.js
