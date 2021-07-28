import { getPeerId, sanitizeParseMode } from "../Utils";
import { Api } from "../tl";
import type { EntityLike } from "../define";
import type { TelegramClient } from "./TelegramClient";
import { utils } from "../index";
import { _EntityType, _entityType, isArrayLike } from "../Helpers";
import { Message } from "../tl/custom/message";
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

// export class MessageParseMethods {

export interface ParseInterface {
    parse: (message: string) => [string, Api.TypeMessageEntity[]];
    unparse: (text: string, entities: Api.TypeMessageEntity[]) => string;
}

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
            userId: await client.getInputEntity(user),
        });
        return true;
    } catch (e) {
        return false;
    }
}

export function _parseMessageText(
    client: TelegramClient,
    message: string,
    parseMode: false | string | ParseInterface
): [string, Api.TypeMessageEntity[]] {
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
    return parseMode.parse(message);
}

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
    const idToMessage = new Map<number, Message>();
    const schedToMessage = new Map<number, Message>();
    for (const update of updates) {
        if (update instanceof Api.UpdateMessageID) {
            randomToId.set(update.randomId.toString(), update.id);
        } else if (
            update instanceof Api.UpdateNewChannelMessage ||
            update instanceof Api.UpdateNewMessage
        ) {
            (update.message as unknown as Message)._finishInit(
                client,
                entities,
                inputChat
            );
            if ("randomId" in request || isArrayLike(request)) {
                idToMessage.set(
                    update.message.id,
                    update.message as unknown as Message
                );
            } else {
                return update.message as unknown as Message;
            }
        } else if (
            update instanceof Api.UpdateEditMessage &&
            "peer" in request &&
            _entityType(request.peer) != _EntityType.CHANNEL
        ) {
            (update.message as unknown as Message)._finishInit(
                client,
                entities,
                inputChat
            );
            if ("randomId" in request) {
                idToMessage.set(
                    update.message.id,
                    update.message as unknown as Message
                );
            } else if ("id" in request && request.id === update.message.id) {
                return update.message;
            }
        } else if (
            update instanceof Api.UpdateEditChannelMessage &&
            "peer" in request &&
            getPeerId(request.peer) ==
                getPeerId((update.message as unknown as Message).peerId!)
        ) {
            if (request.id == update.message.id) {
                (update.message as unknown as Message)._finishInit(
                    client,
                    entities,
                    inputChat
                );
                return update.message;
            }
        } else if (update instanceof Api.UpdateNewScheduledMessage) {
            (update.message as unknown as Message)._finishInit(
                client,
                entities,
                inputChat
            );
            schedToMessage.set(
                update.message.id,
                update.message as unknown as Message
            );
        } else if (update instanceof Api.UpdateMessagePoll) {
            if (request.media.poll.id == update.pollId) {
                const m = new Message({
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
        const msg = idToMessage.get(randomToId.get(randomId)!);
        if (!msg) {
            client._log.warn(
                `Request ${request} had missing message mapping ${result}`
            );
        }
        return msg;
    } else {
        const mapping = [];
        for (let i = 0; i < randomId.length; i++) {
            const rnd = randomId[i] + "";
            const msg = idToMessage.get(randomToId.get(rnd)!);
            if (!msg) {
                client._log.warn(
                    `Request ${request} had missing message mapping ${result}`
                );
                break;
            } else {
                mapping.push(msg);
            }
        }
        return mapping;
    }
}
