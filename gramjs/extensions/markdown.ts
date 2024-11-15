import { Api } from "../tl";
import { DEFAULT_DELIMITERS } from "../client/messageParse";

export class MarkdownParser {
    // TODO maybe there is a better way :shrug:
    static parse(message: string): [string, Api.TypeMessageEntity[]] {
        let i = 0;
        const keys: { [key: string]: boolean } = {};
        for (const k in DEFAULT_DELIMITERS) {
            keys[k] = false;
        }
        const entities = [];
        const tempEntities: { [key: string]: any } = {};
        while (i < message.length) {
            let foundIndex = -1;
            let foundDelim = undefined;
            for (const key of Object.keys(DEFAULT_DELIMITERS)) {
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
                tempEntities[foundDelim] = new DEFAULT_DELIMITERS[foundDelim]({
                    offset: foundIndex,
                    length: -1,
                    language: "",
                });
                keys[foundDelim] = true;
            } else {
                keys[foundDelim] = false;
                tempEntities[foundDelim].length =
                    foundIndex - tempEntities[foundDelim].offset;
                entities.push(tempEntities[foundDelim]);
            }
            message = message.toString().replace(foundDelim, "");
            i = foundIndex;
        }
        return [message, entities];
    }

    static unparse(
        text: string,
        entities: Api.TypeMessageEntity[] | undefined
    ) {
        const delimiters = DEFAULT_DELIMITERS;
        if (!text || !entities) {
            return text;
        }
        let insertAt: [number, string][] = [];

        const tempDelimiters: Map<string, string> = new Map();
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
        insertAt = insertAt.sort((a: [number, string], b: [number, string]) => {
            return a[0] - b[0];
        });
        while (insertAt.length) {
            const [at, what] = insertAt.pop() as [number, string];
            text = text.slice(0, at) + what + text.slice(at);
        }
        return text;
    }
}
