import { getPeerId, sanitizeParseMode } from "../Utils";
import { Api } from "../tl/api";
import type { EntityLike } from "../define";
import type { TelegramClient } from "./TelegramClient";
import { utils } from "../index";
import { _EntityType, _entityType, isArrayLike } from "../Helpers";
import bigInt from "big-integer";

export type messageEntities =
    | typeof Api.MessageEntityBold
    | typeof Api.MessageEntityItalic
    | typeof Api.MessageEntityStrike
    | typeof Api.MessageEntityCode
    | typeof Api.MessageEntityPre;
export const DEFAULT_DELIMITERS: {
    [key: string]: messageEntities;
} = {
    "**": Api.MessageEntityBold,
    __: Api.MessageEntityItalic,
    "~~": Api.MessageEntityStrike,
    "`": Api.MessageEntityCode,
    "```": Api.MessageEntityPre,
};

export interface ParseInterface {
    parse: (message: string) => [string, Api.TypeMessageEntity[]];
    unparse: (text: string, entities: Api.TypeMessageEntity[]) => string;
}

/** @hidden */
export async function _replaceWithMention(
    client: TelegramClient,
    entities: Api.TypeMessageEntity[],
    i: number,
    user: EntityLike
) {
    try {
        entities[i] = new Api.InputMessageEntityMentionName({
            offset: entities[i].offset,
            length: entities[i].length,
            userId: (await client.getInputEntity(
                user
            )) as unknown as Api.TypeInputUser,
        });
        return true;
    } catch (e) {
        return false;
    }
}

/** @hidden */
export async function _parseMessageText(
    client: TelegramClient,
    message: string,
    parseMode: false | string | ParseInterface
): Promise<[string, Api.TypeMessageEntity[]]> {
    if (parseMode == false) {
        return [message, []];
    }
    if (parseMode == undefined) {
        if (client.parseMode == undefined) {
            return [message, []];
        }
        parseMode = client.parseMode;
    } else if (typeof parseMode === "string") {
        parseMode = sanitizeParseMode(parseMode);
    }
    const [rawMessage, msgEntities] = parseMode.parse(message);
    for (let i = msgEntities.length - 1; i >= 0; i--) {
        const e = msgEntities[i];
        if (e instanceof Api.MessageEntityTextUrl) {
            const m = /^@|\+|tg:\/\/user\?id=(\d+)/.exec(e.url);
            if (m) {
                const userIdOrUsername = m[1] ? Number(m[1]) : e.url;
                const isMention = await _replaceWithMention(
                    client,
                    msgEntities,
                    i,
                    userIdOrUsername
                );
                if (!isMention) {
                    msgEntities.splice(i, 1);
                }
            }
        }
    }
    return [rawMessage, msgEntities];
}

/** @hidden */
export function _getResponseMessage(
    client: TelegramClient,
    request: any,
    result: any,
    inputChat: any
) {
    let updates = [];

    let entities = new Map();
    if (result instanceof Api.UpdateShort) {
        updates = [result.update];
    } else if (
        result instanceof Api.Updates ||
        result instanceof Api.UpdatesCombined
    ) {
        updates = result.updates;
        for (const x of [...result.users, ...result.chats]) {
            entities.set(utils.getPeerId(x), x);
        }
    } else {
        return;
    }
    const randomToId = new Map<string, number>();
    const idToMessage = new Map<number, Api.Message>();
    const schedToMessage = new Map<number, Api.Message>();
    for (const update of updates) {
        if (update instanceof Api.UpdateMessageID) {
            randomToId.set(update.randomId!.toString(), update.id);
        } else if (
            update instanceof Api.UpdateNewChannelMessage ||
            update instanceof Api.UpdateNewMessage
        ) {
            (update.message as unknown as Api.Message)._finishInit(
                client,
                entities,
                inputChat
            );
            if ("randomId" in request || isArrayLike(request)) {
                idToMessage.set(
                    update.message.id,
                    update.message as unknown as Api.Message
                );
            } else {
                return update.message as unknown as Api.Message;
            }
        } else if (
            update instanceof Api.UpdateEditMessage &&
            "peer" in request &&
            _entityType(request.peer) != _EntityType.CHANNEL
        ) {
            (update.message as unknown as Api.Message)._finishInit(
                client,
                entities,
                inputChat
            );
            if ("randomId" in request) {
                idToMessage.set(
                    update.message.id,
                    update.message as unknown as Api.Message
                );
            } else if ("id" in request && request.id === update.message.id) {
                return update.message;
            }
        } else if (
            update instanceof Api.UpdateEditChannelMessage &&
            "peer" in request &&
            getPeerId(request.peer) ==
                getPeerId((update.message as unknown as Api.Message).peerId!)
        ) {
            if (request.id == update.message.id) {
                (update.message as unknown as Api.Message)._finishInit(
                    client,
                    entities,
                    inputChat
                );
                return update.message;
            }
        } else if (update instanceof Api.UpdateNewScheduledMessage) {
            (update.message as unknown as Api.Message)._finishInit(
                client,
                entities,
                inputChat
            );
            schedToMessage.set(
                update.message.id,
                update.message as unknown as Api.Message
            );
        } else if (update instanceof Api.UpdateMessagePoll) {
            if (request.media.poll.id == update.pollId) {
                const m = new Api.Message({
                    id: request.id,
                    peerId: utils.getPeerId(request.peer),
                    media: new Api.MessageMediaPoll({
                        poll: update.poll!,
                        results: update.results,
                    }),
                    message: "",
                    date: 0,
                });
                m._finishInit(client, entities, inputChat);
                return m;
            }
        }
    }
    if (request == undefined) {
        return idToMessage;
    }
    let mapping: Map<number, Api.Message>;
    let opposite = new Map<number, Api.Message>();
    if ("scheduleDate" in request && request.scheduleDate != undefined) {
        mapping = schedToMessage;
        opposite = idToMessage;
    } else {
        mapping = idToMessage;
    }
    let randomId =
        isArrayLike(request) ||
        typeof request == "number" ||
        bigInt.isInstance(request)
            ? request
            : request.randomId.toString();
    if (!randomId) {
        client._log.warn(
            `No randomId in ${request} to map to. returning undefined for ${result}`
        );
        return undefined;
    }

    if (!isArrayLike(randomId)) {
        let msg = mapping.get(randomToId.get(randomId)!);
        if (!msg) {
            msg = opposite.get(randomToId.get(randomId)!);
        }
        if (!msg) {
            client._log.warn(
                `Request ${request.className} had missing message mapping ${result.className}`
            );
        }
        return msg;
    } else {
        let arrayRandomId: bigInt.BigInteger[] =
            randomId as bigInt.BigInteger[];
        const mappingToReturn = [];
        let warned = false;
        for (let i = 0; i < arrayRandomId.length; i++) {
            const tempRandom = arrayRandomId[i];
            if (tempRandom == undefined) {
                warned = true;
                break;
            }
            const rnd = tempRandom.toString();
            const msgId = randomToId.get(rnd);
            if (msgId == undefined) {
                warned = true;
                break;
            }
            const msg = mapping.get(msgId);
            if (!msg) {
                warned = true;
                break;
            } else {
                mappingToReturn.push(msg);
            }
        }
        if (!warned) {
            return mappingToReturn;
        }
        const oppositeToReturn = [];
        warned = false;
        for (let i = 0; i < randomId.length; i++) {
            const rnd = randomId[i] + "";
            const msg = opposite.get(randomToId.get(rnd)!);
            if (!msg) {
                client._log.warn(
                    `Request ${request} had missing message mapping ${result}`
                );
                warned = true;
                break;
            } else {
                oppositeToReturn.push(msg);
            }
        }
        if (!warned) {
            return mappingToReturn;
        }
    }
    const finalToReturn = [];
    for (let i = 0; i < randomId.length; i++) {
        const rnd = randomId[i] + "";
        if (randomToId.has(rnd)) {
            finalToReturn.push(
                mapping.get(randomToId.get(rnd)!) ||
                    opposite.get(randomToId.get(rnd)!)
            );
        }
    }
    return finalToReturn;
}
