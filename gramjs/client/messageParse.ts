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
    let schedMessage;
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
            schedMessage = update.message as unknown as Api.Message;
            idToMessage.set(
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
    let randomId;
    if (
        isArrayLike(request) ||
        typeof request == "number" ||
        bigInt.isInstance(request)
    ) {
        randomId = request;
    } else {
        randomId = request.randomId;
    }
    if (!randomId) {
        if (schedMessage) {
            return schedMessage;
        }
        client._log.warn(
            `No randomId in ${request} to map to. returning undefined for ${result} (Message was empty)`
        );
        return undefined;
    }
    if (!isArrayLike(randomId)) {
        let msg = idToMessage.get(randomToId.get(randomId.toString())!);
        if (!msg) {
            client._log.warn(
                `Request ${request.className} had missing message mapping ${result.className} (Message was empty)`
            );
        }
        return msg;
    }
    const final = [];
    let warned = false;
    for (const rnd of randomId) {
        const tmp = randomToId.get((rnd as any).toString());
        if (!tmp) {
            warned = true;
            break;
        }
        const tmp2 = idToMessage.get(tmp);
        if (!tmp2) {
            warned = true;
            break;
        }
        final.push(tmp2);
    }
    if (warned) {
        client._log.warn(
            `Request ${request.className} had missing message mapping ${result.className} (Message was empty)`
        );
    }
    const finalToReturn = [];
    for (const rnd of randomId) {
        finalToReturn.push(
            idToMessage.get(randomToId.get((rnd as any).toString())!)
        );
    }

    return finalToReturn;
}
