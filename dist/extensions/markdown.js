"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownParser = void 0;
const messageParse_1 = require("../client/messageParse");
class MarkdownParser {
    // TODO maybe there is a better way :shrug:
    static parse(message) {
        let i = 0;
        const keys = {};
        for (const k in messageParse_1.DEFAULT_DELIMITERS) {
            keys[k] = false;
        }
        const entities = [];
        const tempEntities = {};
        while (i < message.length) {
            let foundIndex = -1;
            let foundDelim = undefined;
            for (const key of Object.keys(messageParse_1.DEFAULT_DELIMITERS)) {
                const index = message.indexOf(key, i);
                if (index > -1 && (foundIndex === -1 || index < foundIndex)) {
                    foundIndex = index;
                    foundDelim = key;
                }
            }
            if (foundIndex === -1 || foundDelim == undefined) {
                break;
            }
            if (!keys[foundDelim]) {
                tempEntities[foundDelim] = new messageParse_1.DEFAULT_DELIMITERS[foundDelim]({
                    offset: foundIndex,
                    length: -1,
                    language: "",
                });
                keys[foundDelim] = true;
            }
            else {
                keys[foundDelim] = false;
                tempEntities[foundDelim].length =
                    foundIndex - tempEntities[foundDelim].offset;
                entities.push(tempEntities[foundDelim]);
            }
            message = message.replace(foundDelim, "");
            i = foundIndex;
        }
        return [message, entities];
    }
    static unparse(text, entities) {
        const delimiters = messageParse_1.DEFAULT_DELIMITERS;
        if (!text || !entities) {
            return text;
        }
        let insertAt = [];
        const tempDelimiters = new Map();
        Object.keys(delimiters).forEach((key) => {
            tempDelimiters.set(delimiters[key].className, key);
        });
        for (const entity of entities) {
            const s = entity.offset;
            const e = entity.offset + entity.length;
            const delimiter = tempDelimiters.get(entity.className);
            if (delimiter) {
                insertAt.push([s, delimiter]);
                insertAt.push([e, delimiter]);
            }
        }
        insertAt = insertAt.sort((a, b) => {
            return a[0] - b[0];
        });
        while (insertAt.length) {
            const [at, what] = insertAt.pop();
            text = text.slice(0, at) + what + text.slice(at);
        }
        return text;
    }
}
exports.MarkdownParser = MarkdownParser;
