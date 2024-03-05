"use strict";
const { inspect } = require("../inspect");
const bigInt = require("big-integer");
const { generateRandomBytes, readBigIntFromBuffer, isArrayLike, betterConsoleLog, } = require("../Helpers");
const tlContent = require("./apiTl.js");
const schemeContent = require("./schemaTl.js");
function generateRandomBigInt() {
    return readBigIntFromBuffer(generateRandomBytes(8), false, true);
}
const { parseTl, serializeBytes, serializeDate, } = require("./generationHelpers");
const { toSignedLittleBuffer } = require("../Helpers");
const NAMED_AUTO_CASTS = new Set(["chatId,int"]);
const NAMED_BLACKLIST = new Set(["discardEncryption"]);
const AUTO_CASTS = new Set([
    "InputPeer",
    "InputChannel",
    "InputUser",
    "InputDialogPeer",
    "InputNotifyPeer",
    "InputMedia",
    "InputPhoto",
    "InputMessage",
    "InputDocument",
    "InputChatPhoto",
]);
class CastError extends Error {
    constructor(objectName, expected, actual, ...params) {
        // Pass remaining arguments (including vendor specific ones) to parent constructor
        const message = "Found wrong type for " +
            objectName +
            ". expected " +
            expected +
            " but received " +
            actual +
            ".If you think this is a mistake please report it.";
        super(message, ...params);
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CastError);
        }
        this.name = "CastError";
        // Custom debugging information
    }
}
const CACHING_SUPPORTED = typeof self !== "undefined" && self.localStorage !== undefined;
const CACHE_KEY = "GramJs:apiCache";
function buildApiFromTlSchema() {
    let definitions;
    const fromCache = CACHING_SUPPORTED && loadFromCache();
    if (fromCache) {
        definitions = fromCache;
    }
    else {
        definitions = loadFromTlSchemas();
        if (CACHING_SUPPORTED) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(definitions));
        }
    }
    return createClasses("all", definitions);
}
function loadFromCache() {
    const jsonCache = localStorage.getItem(CACHE_KEY);
    return jsonCache && JSON.parse(jsonCache);
}
function loadFromTlSchemas() {
    const [constructorParamsApi, functionParamsApi] = extractParams(tlContent);
    const [constructorParamsSchema, functionParamsSchema] = extractParams(schemeContent);
    const constructors = [].concat(constructorParamsApi, constructorParamsSchema);
    const requests = [].concat(functionParamsApi, functionParamsSchema);
    return [].concat(constructors, requests);
}
function extractParams(fileContent) {
    const f = parseTl(fileContent, 109);
    const constructors = [];
    const functions = [];
    for (const d of f) {
        d.isFunction ? functions.push(d) : constructors.push(d);
    }
    return [constructors, functions];
}
function argToBytes(x, type, argName, requestName) {
    switch (type) {
        case "int":
            const i = Buffer.alloc(4);
            i.writeInt32LE(x, 0);
            return i;
        case "long":
            return toSignedLittleBuffer(x, 8);
        case "int128":
            return toSignedLittleBuffer(x, 16);
        case "int256":
            return toSignedLittleBuffer(x, 32);
        case "double":
            const d = Buffer.alloc(8);
            d.writeDoubleLE(x, 0);
            return d;
        case "string":
            return serializeBytes(x);
        case "Bool":
            return x
                ? Buffer.from("b5757299", "hex")
                : Buffer.from("379779bc", "hex");
        case "true":
            return Buffer.alloc(0);
        case "bytes":
            return serializeBytes(x);
        case "date":
            return serializeDate(x);
        default:
            if (x === undefined || typeof x.getBytes !== "function") {
                throw new Error(`Required object ${argName} of ${requestName} is undefined`);
            }
            return x.getBytes();
    }
}
async function getInputFromResolve(utils, client, peer, peerType) {
    switch (peerType) {
        case "InputPeer":
            return utils.getInputPeer(await client.getInputEntity(peer));
        case "InputChannel":
            return utils.getInputChannel(await client.getInputEntity(peer));
        case "InputUser":
            return utils.getInputUser(await client.getInputEntity(peer));
        case "InputDialogPeer":
            return await client._getInputDialog(peer);
        case "InputNotifyPeer":
            return await client._getInputNotify(peer);
        case "InputMedia":
            return utils.getInputMedia(peer);
        case "InputPhoto":
            return utils.getInputPhoto(peer);
        case "InputMessage":
            return utils.getInputMessage(peer);
        case "InputDocument":
            return utils.getInputDocument(peer);
        case "InputChatPhoto":
            return utils.getInputChatPhoto(peer);
        case "chatId,int":
            return await client.getPeerId(peer, false);
        default:
            throw new Error("unsupported peer type : " + peerType);
    }
}
function getArgFromReader(reader, arg) {
    if (arg.isVector) {
        if (arg.useVectorId) {
            reader.readInt();
        }
        const temp = [];
        const len = reader.readInt();
        arg.isVector = false;
        for (let i = 0; i < len; i++) {
            temp.push(getArgFromReader(reader, arg));
        }
        arg.isVector = true;
        return temp;
    }
    else if (arg.flagIndicator) {
        return reader.readInt();
    }
    else {
        switch (arg.type) {
            case "int":
                return reader.readInt();
            case "long":
                return reader.readLong();
            case "int128":
                return reader.readLargeInt(128);
            case "int256":
                return reader.readLargeInt(256);
            case "double":
                return reader.readDouble();
            case "string":
                return reader.tgReadString();
            case "Bool":
                return reader.tgReadBool();
            case "true":
                return true;
            case "bytes":
                return reader.tgReadBytes();
            case "date":
                return reader.tgReadDate();
            default:
                if (!arg.skipConstructorId) {
                    return reader.tgReadObject();
                }
                else {
                    return api.constructors[arg.type].fromReader(reader);
                }
        }
    }
}
function compareType(value, type) {
    let correct = true;
    switch (type) {
        case "number":
            correct = typeof value === "number" || value === undefined;
            break;
        case "string":
        case "boolean":
            correct = typeof value === type;
            break;
        case "bigInt":
            correct =
                bigInt.isInstance(value) ||
                    typeof value === "bigint" ||
                    typeof value === "number" ||
                    typeof value === "string" ||
                    value === undefined;
            break;
        case "true":
            // true value is always correct
            break;
        case "buffer":
            correct = Buffer.isBuffer(value);
            break;
        case "date":
            correct =
                (value &&
                    Object.prototype.toString.call(value) === "[object Date]" &&
                    !isNaN(value)) ||
                    typeof value === "number";
            break;
        default:
            console.error(new Error("Unknown type." + type));
    }
    return correct;
}
function createClasses(classesType, params) {
    const classes = {};
    for (const classParams of params) {
        const { name, constructorId, subclassOfId, argsConfig, namespace, isFunction, result, } = classParams;
        const fullName = [namespace, name].join(".").replace(/^\./, "");
        class VirtualClass {
            constructor(args) {
                this.CONSTRUCTOR_ID = constructorId;
                this.SUBCLASS_OF_ID = subclassOfId;
                this.className = fullName;
                this.classType = isFunction ? "request" : "constructor";
                args = args || {};
                this.originalArgs = args;
                this.init(args);
                for (const argName in argsConfig) {
                    if (argName === "randomId" && !args[argName]) {
                        if (argsConfig[argName].isVector) {
                            const rands = [];
                            for (let i = 0; i < args["id"].length; i++) {
                                rands.push(generateRandomBigInt());
                            }
                            this[argName] = rands;
                        }
                        else {
                            this[argName] = generateRandomBigInt();
                        }
                    }
                    else {
                        this[argName] = args[argName];
                    }
                }
            }
            init(args) { }
            static fromReader(reader) {
                const args = {};
                for (const argName in argsConfig) {
                    if (argsConfig.hasOwnProperty(argName)) {
                        const arg = argsConfig[argName];
                        if (arg.isFlag) {
                            if (arg.type === "true") {
                                args[argName] = Boolean(args[arg.flagName] & (1 << arg.flagIndex));
                                continue;
                            }
                            if (args[arg.flagName] & (1 << arg.flagIndex)) {
                                args[argName] = getArgFromReader(reader, arg);
                            }
                            else {
                                args[argName] = null;
                            }
                        }
                        else {
                            if (arg.flagIndicator) {
                                arg.name = argName;
                            }
                            args[argName] = getArgFromReader(reader, arg);
                        }
                    }
                }
                return new this(args);
            }
            validate() {
                for (const arg in argsConfig) {
                    if (argsConfig.hasOwnProperty(arg)) {
                        if (argsConfig[arg].flagIndicator ||
                            argsConfig[arg].isFlag) {
                            // we don't care about flags
                            continue;
                        }
                        const currentValue = this[arg];
                        this.assertType(arg, argsConfig[arg], currentValue);
                    }
                }
            }
            assertType(objectName, object, value) {
                let expected;
                if (object["isVector"]) {
                    if (!isArrayLike(value)) {
                        console.error(new CastError(objectName, "array", value));
                    }
                    if (value == undefined) {
                        value = [];
                    }
                    for (const o of value) {
                        this.assertType(objectName, Object.assign(Object.assign({}, object), { isVector: false }), o);
                    }
                }
                else {
                    switch (object["type"]) {
                        case "int":
                            expected = "number";
                            break;
                        case "long":
                        case "int128":
                        case "int256":
                            expected = "bigInt";
                            break;
                        case "double":
                            expected = "number";
                            break;
                        case "string":
                            expected = "string";
                            break;
                        case "Bool":
                            expected = "boolean";
                            break;
                        case "true":
                            expected = "true";
                            break;
                        case "bytes":
                            expected = "buffer";
                            break;
                        case "date":
                            expected = "date";
                            break;
                        default:
                            expected = "object";
                    }
                    if (expected === "object") {
                        // will be validated in get byte();
                    }
                    else {
                        const isCorrectType = compareType(value, expected);
                        if (isCorrectType !== true) {
                            console.error(new CastError(objectName, expected, value));
                        }
                    }
                }
            }
            getBytes() {
                try {
                    this.validate();
                }
                catch (e) {
                    // feature still in alpha so errors are expected.
                }
                const idForBytes = this.CONSTRUCTOR_ID;
                const c = Buffer.alloc(4);
                c.writeUInt32LE(idForBytes, 0);
                const buffers = [c];
                for (const arg in argsConfig) {
                    if (argsConfig.hasOwnProperty(arg)) {
                        if (argsConfig[arg].isFlag) {
                            if ((this[arg] === false &&
                                argsConfig[arg].type !== "Bool") ||
                                this[arg] === null ||
                                this[arg] === undefined ||
                                argsConfig[arg].type === "true") {
                                continue;
                            }
                        }
                        if (argsConfig[arg].isVector) {
                            if (argsConfig[arg].useVectorId) {
                                buffers.push(Buffer.from("15c4b51c", "hex"));
                            }
                            const l = Buffer.alloc(4);
                            l.writeInt32LE(this[arg].length, 0);
                            buffers.push(l, Buffer.concat(this[arg].map((x) => argToBytes(x, argsConfig[arg].type, fullName))));
                        }
                        else if (argsConfig[arg].flagIndicator) {
                            if (!Object.values(argsConfig).some((f) => f.isFlag)) {
                                buffers.push(Buffer.alloc(4));
                            }
                            else {
                                let flagCalculate = 0;
                                for (const f in argsConfig) {
                                    if (argsConfig[f].isFlag &&
                                        arg === argsConfig[f].flagName) {
                                        if ((this[f] === false &&
                                            argsConfig[f].type !==
                                                "Bool") ||
                                            this[f] === undefined ||
                                            this[f] === null) {
                                            flagCalculate |= 0;
                                        }
                                        else {
                                            flagCalculate |=
                                                1 << argsConfig[f].flagIndex;
                                        }
                                    }
                                }
                                const f = Buffer.alloc(4);
                                f.writeUInt32LE(flagCalculate, 0);
                                buffers.push(f);
                            }
                        }
                        else {
                            buffers.push(argToBytes(this[arg], argsConfig[arg].type, arg, fullName));
                            if (this[arg] &&
                                typeof this[arg].getBytes === "function") {
                                let boxed = argsConfig[arg].type.charAt(argsConfig[arg].type.indexOf(".") + 1);
                                boxed = boxed === boxed.toUpperCase();
                                if (!boxed) {
                                    buffers.shift();
                                }
                            }
                        }
                    }
                }
                return Buffer.concat(buffers);
            }
            readResult(reader) {
                if (!isFunction) {
                    throw new Error("`readResult()` called for non-request instance");
                }
                const m = result.match(/Vector<(int|long)>/);
                if (m) {
                    reader.readInt();
                    const temp = [];
                    const len = reader.readInt();
                    if (m[1] === "int") {
                        for (let i = 0; i < len; i++) {
                            temp.push(reader.readInt());
                        }
                    }
                    else {
                        for (let i = 0; i < len; i++) {
                            temp.push(reader.readLong());
                        }
                    }
                    return temp;
                }
                else {
                    return reader.tgReadObject();
                }
            }
            async resolve(client, utils) {
                if (!isFunction) {
                    throw new Error("`resolve()` called for non-request instance");
                }
                for (const arg in argsConfig) {
                    if (argsConfig.hasOwnProperty(arg)) {
                        if (!AUTO_CASTS.has(argsConfig[arg].type)) {
                            if (!NAMED_AUTO_CASTS.has(`${argsConfig[arg].name},${argsConfig[arg].type}`)) {
                                continue;
                            }
                        }
                        if (argsConfig[arg].isFlag) {
                            if (!this[arg]) {
                                continue;
                            }
                        }
                        if (argsConfig[arg].isVector) {
                            const temp = [];
                            for (const x of this[arg]) {
                                temp.push(await getInputFromResolve(utils, client, x, argsConfig[arg].type));
                            }
                            this[arg] = temp;
                        }
                        else {
                            this[arg] = await getInputFromResolve(utils, client, this[arg], argsConfig[arg].type);
                        }
                    }
                }
            }
            [inspect.custom]() {
                return betterConsoleLog(this);
            }
            toJSON() {
                return Object.assign(Object.assign({}, this.originalArgs), { className: fullName });
            }
        }
        VirtualClass.CONSTRUCTOR_ID = constructorId;
        VirtualClass.SUBCLASS_OF_ID = subclassOfId;
        VirtualClass.className = fullName;
        VirtualClass.classType = isFunction ? "request" : "constructor";
        if (namespace) {
            if (!classes[namespace]) {
                classes[namespace] = {};
            }
            classes[namespace][name] = VirtualClass;
        }
        else {
            classes[name] = VirtualClass;
        }
    }
    return classes;
}
const api = buildApiFromTlSchema();
module.exports = { Api: api };
