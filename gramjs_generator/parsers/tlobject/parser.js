const fs = require('fs');
const { TLArg } = require('./tlarg');
const { TLObject } = require('./tlobject');
const { Usability } = require('../methods');

const CORE_TYPES = new Set([
    0xbc799737, // boolFalse#bc799737 = Bool;
    0x997275b5, // boolTrue#997275b5 = Bool;
    0x3fedd339, // true#3fedd339 = True;
    0xc4b9f9bb, // error#c4b9f9bb code:int text:string = Error;
    0x56730bcc, // null#56730bcc = Null;
]);

// Telegram Desktop (C++) doesn't care about string/bytes, and the .tl files
// don't either. However in Python we *do*, and we want to deal with bytes
// for the authorization key process, not UTF-8 strings (they won't be).
//
// Every type with an ID that's in here should get their attribute types
// with string being replaced with bytes.
const AUTH_KEY_TYPES = new Set([
    0x05162463, // resPQ,
    0x83c95aec, // p_q_inner_data
    0xa9f55f95, // p_q_inner_data_dc
    0x3c6a84d4, // p_q_inner_data_temp
    0x56fddf88, // p_q_inner_data_temp_dc
    0xd0e8075c, // server_DH_params_ok
    0xb5890dba, // server_DH_inner_data
    0x6643b654, // client_DH_inner_data
    0xd712e4be, // req_DH_params
    0xf5045f1f, // set_client_DH_params
    0x3072cfa1, // gzip_packed
]);

const findall = (regex, str, matches) => {
    if (!matches) {
        matches = [];
    }

    if (!regex.flags.includes(`g`)) {
        regex = new RegExp(regex.source, `g`);
    }

    const res = regex.exec(str);

    if (res) {
        matches.push(res.slice(1));
        findall(regex, str, matches);
    }

    return matches;
};

const fromLine = (line, isFunction, methodInfo, layer) => {
    const match = line.match(/([\w.]+)(?:#([0-9a-fA-F]+))?(?:\s{?\w+:[\w\d<>#.?!]+}?)*\s=\s([\w\d<>#.?]+);$/);

    if (!match) {
        // Probably "vector#1cb5c415 {t:Type} # [ t ] = Vector t;"
        throw new Error(`Cannot parse TLObject ${line}`);
    }

    const argsMatch = findall(/({)?(\w+):([\w\d<>#.?!]+)}?/, line);
    const [, name] = match;
    methodInfo = methodInfo[name];

    let usability;
    let friendly;

    if (methodInfo) {
        usability = methodInfo.usability;
        friendly = methodInfo.friendly;
    } else {
        usability = Usability.UNKNOWN;
        friendly = null;
    }

    return new TLObject(
        name,
        match[2],
        argsMatch.map(([brace, name, argType]) => new TLArg(name, argType, brace !== undefined)),
        match[3],
        isFunction,
        usability,
        friendly,
        layer
    );
};

/**
 * This method yields TLObjects from a given .tl file.
 *
 * Note that the file is parsed completely before the function yields
 * because references to other objects may appear later in the file.
 */
const parseTl = function* (filePath, layer, methods, ignoreIds = CORE_TYPES) {
    const methodInfo = (methods || []).reduce((o, m) => ({ ...o, [m.name]: m }), {});
    const objAll = [];
    const objByName = {};
    const objByType = {};

    const file = fs.readFileSync(filePath, { encoding: 'utf-8' });

    let isFunction = false;

    for (let line of file.split('\n')) {
        const commentIndex = line.indexOf('//');

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
            isFunction = followingTypes === 'functions';
            continue;
        }

        try {
            const result = fromLine(line, isFunction, methodInfo, layer);

            if (ignoreIds.has(result.id)) {
                continue;
            }

            objAll.push(result);

            if (!result.isFunction) {
                if (!objByType[result.result]) {
                    objByType[result.result] = [];
                }

                objByName[result.fullname] = result;
                objByType[result.result].push(result);
            }
        } catch (e) {
            if (!e.toString().includes('vector#1cb5c415')) {
                throw e;
            }
        }
    }

    // Once all objects have been parsed, replace the
    // string type from the arguments with references
    for (const obj of objAll) {
        if (AUTH_KEY_TYPES.has(obj.id)) {
            for (const arg of obj.args) {
                if (arg.type === 'string') {
                    arg.type = 'bytes';
                }
            }
        }

        for (const arg of obj.args) {
            arg.cls = objByType[arg.type] || (arg.type in objByName ? [objByName[arg.type]] : []);
        }
    }

    for (const obj of objAll) {
        yield obj;
    }
};

/**
 * Finds the layer used on the specified scheme.tl file.
 */
const findLayer = (filePath) => {
    const layerRegex = /^\/\/\s*LAYER\s*(\d+)$/;

    const file = fs.readFileSync(filePath, { encoding: 'utf-8' });

    for (const line of file.split('\n')) {
        const match = line.match(layerRegex);

        if (match) {
            return Number(match[1]);
        }
    }
};

module.exports = {
    parseTl,
    findLayer,
};
