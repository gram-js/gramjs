"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.variableSnakeToCamelCase = exports.snakeToCamelCase = exports.CORE_TYPES = exports.fromLine = exports.buildArgConfig = exports.parseTl = exports.findAll = exports.serializeDate = exports.serializeBytes = void 0;
const Helpers_1 = require("../Helpers");
const snakeToCamelCase = (name) => {
    const result = name.replace(/(?:^|_)([a-z])/g, (_, g) => g.toUpperCase());
    return result.replace(/_/g, "");
};
exports.snakeToCamelCase = snakeToCamelCase;
const variableSnakeToCamelCase = (str) => str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace("-", "").replace("_", ""));
exports.variableSnakeToCamelCase = variableSnakeToCamelCase;
const CORE_TYPES = new Set([
    0xbc799737,
    0x997275b5,
    0x3fedd339,
    0xc4b9f9bb,
    0x56730bcc, // null#56730bcc = Null;
]);
exports.CORE_TYPES = CORE_TYPES;
const AUTH_KEY_TYPES = new Set([
    0x05162463,
    0x83c95aec,
    0xa9f55f95,
    0x3c6a84d4,
    0x56fddf88,
    0xd0e8075c,
    0xb5890dba,
    0x6643b654,
    0xd712e4be,
    0xf5045f1f,
    0x3072cfa1, // gzip_packed
]);
const fromLine = (line, isFunction) => {
    const match = line.match(/([\w.]+)(?:#([0-9a-fA-F]+))?(?:\s{?\w+:[\w\d<>#.?!]+}?)*\s=\s([\w\d<>#.?]+);$/);
    if (!match) {
        // Probably "vector#1cb5c415 {t:Type} # [ t ] = Vector t;"
        throw new Error(`Cannot parse TLObject ${line}`);
    }
    const argsMatch = findAll(/({)?(\w+):([\w\d<>#.?!]+)}?/, line);
    const currentConfig = {
        name: match[1],
        constructorId: parseInt(match[2], 16),
        argsConfig: {},
        subclassOfId: (0, Helpers_1.crc32)(match[3]),
        result: match[3],
        isFunction: isFunction,
        namespace: undefined,
    };
    if (!currentConfig.constructorId) {
        const hexId = "";
        let args;
        if (Object.values(currentConfig.argsConfig).length) {
            args = ` ${Object.keys(currentConfig.argsConfig)
                .map((arg) => arg.toString())
                .join(" ")}`;
        }
        else {
            args = "";
        }
        const representation = `${currentConfig.name}${hexId}${args} = ${currentConfig.result}`
            .replace(/(:|\?)bytes /g, "$1string ")
            .replace(/</g, " ")
            .replace(/>|{|}/g, "")
            .replace(/ \w+:flags(\d+)?\.\d+\?true/g, "");
        if (currentConfig.name === "inputMediaInvoice") {
            // eslint-disable-next-line no-empty
            if (currentConfig.name === "inputMediaInvoice") {
            }
        }
        currentConfig.constructorId = (0, Helpers_1.crc32)(Buffer.from(representation, "utf8"));
    }
    for (const [brace, name, argType] of argsMatch) {
        if (brace === undefined) {
            // @ts-ignore
            currentConfig.argsConfig[variableSnakeToCamelCase(name)] =
                buildArgConfig(name, argType);
        }
    }
    if (currentConfig.name.includes(".")) {
        [currentConfig.namespace, currentConfig.name] =
            currentConfig.name.split(/\.(.+)/);
    }
    currentConfig.name = snakeToCamelCase(currentConfig.name);
    /*
    for (const arg in currentConfig.argsConfig){
      if (currentConfig.argsConfig.hasOwnProperty(arg)){
        if (currentConfig.argsConfig[arg].flagIndicator){
          delete  currentConfig.argsConfig[arg]
        }
      }
    }*/
    return currentConfig;
};
exports.fromLine = fromLine;
function buildArgConfig(name, argType) {
    name = name === "self" ? "is_self" : name;
    // Default values
    const currentConfig = {
        isVector: false,
        isFlag: false,
        skipConstructorId: false,
        flagName: null,
        flagIndex: -1,
        flagIndicator: true,
        type: null,
        useVectorId: null,
    };
    // Special case: some types can be inferred, which makes it
    // less annoying to type. Currently the only type that can
    // be inferred is if the name is 'random_id', to which a
    // random ID will be assigned if left as None (the default)
    const canBeInferred = name === "random_id";
    // The type can be an indicator that other arguments will be flags
    if (argType !== "#") {
        currentConfig.flagIndicator = false;
        // Strip the exclamation mark always to have only the name
        currentConfig.type = argType.replace(/^!+/, "");
        // The type may be a flag (flags.IDX?REAL_TYPE)
        // Note that 'flags' is NOT the flags name; this
        // is determined by a previous argument
        // However, we assume that the argument will always be starts with 'flags'
        // @ts-ignore
        const flagMatch = currentConfig.type.match(/(flags(?:\d+)?).(\d+)\?([\w<>.]+)/);
        if (flagMatch) {
            currentConfig.isFlag = true;
            // As of layer 140, flagName can be "flags" or "flags2"
            currentConfig.flagName = flagMatch[1];
            currentConfig.flagIndex = Number(flagMatch[2]);
            // Update the type to match the exact type, not the "flagged" one
            currentConfig.type = flagMatch[3];
        }
        // Then check if the type is a Vector<REAL_TYPE>
        // @ts-ignore
        const vectorMatch = currentConfig.type.match(/[Vv]ector<([\w\d.]+)>/);
        if (vectorMatch) {
            currentConfig.isVector = true;
            // If the type's first letter is not uppercase, then
            // it is a constructor and we use (read/write) its ID.
            // @ts-ignore
            currentConfig.useVectorId = currentConfig.type.charAt(0) === "V";
            // Update the type to match the one inside the vector
            [, currentConfig.type] = vectorMatch;
        }
        // See use_vector_id. An example of such case is ipPort in
        // help.configSpecial
        // @ts-ignore
        if (/^[a-z]$/.test(currentConfig.type.split(".").pop().charAt(0))) {
            currentConfig.skipConstructorId = true;
        }
        // The name may contain "date" in it, if this is the case and
        // the type is "int", we can safely assume that this should be
        // treated as a "date" object. Note that this is not a valid
        // Telegram object, but it's easier to work with
        // if (
        //     this.type === 'int' &&
        //     (/(\b|_)([dr]ate|until|since)(\b|_)/.test(name) ||
        //         ['expires', 'expires_at', 'was_online'].includes(name))
        // ) {
        //     this.type = 'date';
        // }
    }
    // workaround
    if (currentConfig.type == "future_salt") {
        currentConfig.type = "FutureSalt";
    }
    return currentConfig;
}
exports.buildArgConfig = buildArgConfig;
const parseTl = function* (content, layer, methods = [], ignoreIds = CORE_TYPES) {
    const methodInfo = (methods || []).reduce((o, m) => (Object.assign(Object.assign({}, o), { [m.name]: m })), {});
    const objAll = [];
    const objByName = {};
    const objByType = {};
    const file = content;
    let isFunction = false;
    for (let line of file.split("\n")) {
        const commentIndex = line.indexOf("//");
        if (commentIndex !== -1) {
            line = line.slice(0, commentIndex);
        }
        line = line.trim();
        if (!line) {
            continue;
        }
        const match = line.match(/---(\w+)---/);
        if (match) {
            const [, followingTypes] = match;
            isFunction = followingTypes === "functions";
            continue;
        }
        try {
            const result = fromLine(line, isFunction);
            if (ignoreIds.has(result.constructorId)) {
                continue;
            }
            objAll.push(result);
            if (!result.isFunction) {
                if (!objByType[result.result]) {
                    objByType[result.result] = [];
                }
                objByName[result.name] = result;
                objByType[result.result].push(result);
            }
        }
        catch (e) {
            if (!e.toString().includes("vector#1cb5c415")) {
                throw e;
            }
        }
    }
    // Once all objects have been parsed, replace the
    // string type from the arguments with references
    for (const obj of objAll) {
        if (AUTH_KEY_TYPES.has(obj.constructorId)) {
            for (const arg in obj.argsConfig) {
                if (obj.argsConfig[arg].type === "string") {
                    obj.argsConfig[arg].type = "bytes";
                }
            }
        }
    }
    for (const obj of objAll) {
        yield obj;
    }
};
exports.parseTl = parseTl;
const findAll = (regex, str, matches = []) => {
    if (!regex.flags.includes("g")) {
        regex = new RegExp(regex.source, "g");
    }
    const res = regex.exec(str);
    if (res) {
        matches.push(res.slice(1));
        findAll(regex, str, matches);
    }
    return matches;
};
exports.findAll = findAll;
function serializeBytes(data) {
    if (!(data instanceof Buffer)) {
        if (typeof data == "string") {
            data = Buffer.from(data);
        }
        else {
            throw Error(`Bytes or str expected, not ${data.constructor.name}`);
        }
    }
    const r = [];
    let padding;
    if (data.length < 254) {
        padding = (data.length + 1) % 4;
        if (padding !== 0) {
            padding = 4 - padding;
        }
        r.push(Buffer.from([data.length]));
        r.push(data);
    }
    else {
        padding = data.length % 4;
        if (padding !== 0) {
            padding = 4 - padding;
        }
        r.push(Buffer.from([
            254,
            data.length % 256,
            (data.length >> 8) % 256,
            (data.length >> 16) % 256,
        ]));
        r.push(data);
    }
    r.push(Buffer.alloc(padding).fill(0));
    return Buffer.concat(r);
}
exports.serializeBytes = serializeBytes;
function serializeDate(dt) {
    if (!dt) {
        return Buffer.alloc(4).fill(0);
    }
    if (dt instanceof Date) {
        dt = Math.floor((Date.now() - dt.getTime()) / 1000);
    }
    if (typeof dt == "number") {
        const t = Buffer.alloc(4);
        t.writeInt32LE(dt, 0);
        return t;
    }
    throw Error(`Cannot interpret "${dt}" as a date`);
}
exports.serializeDate = serializeDate;
