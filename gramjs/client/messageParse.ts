import {sanitizeParseMode} from "../Utils";
import {Api} from "../tl";
import type {EntityLike, ValueOf} from "../define";
import type {TelegramClient} from "./TelegramClient";

export type messageEntities = typeof Api.MessageEntityBold | typeof Api.MessageEntityItalic |
    typeof Api.MessageEntityStrike | typeof Api.MessageEntityCode | typeof Api.MessageEntityPre;
export const DEFAULT_DELIMITERS: {
    [key: string]: messageEntities
} = {
    '**': Api.MessageEntityBold,
    '__': Api.MessageEntityItalic,
    '~~': Api.MessageEntityStrike,
    '`': Api.MessageEntityCode,
    '```': Api.MessageEntityPre
};

// export class MessageParseMethods {

export interface ParseInterface {
    parse: (message: string) => [string, Api.TypeMessageEntity[]],
    unparse: (text: string, entities: Api.TypeMessageEntity[] | undefined) => string
}

export async function _replaceWithMention(client: TelegramClient, entities: Api.TypeMessageEntity[], i: number, user: EntityLike) {
    try {
        entities[i] = new Api.InputMessageEntityMentionName(
            {
                offset: entities[i].offset,
                length: entities[i].length,
                userId: await client.getInputEntity(user)
            }
        )
        return true;
    } catch (e) {
        return false;
    }
}

export function _parseMessageText(client: TelegramClient, message: string, parseMode: any) {
    if (parseMode==false) {
        return [message, []]
    }
    if (parseMode==undefined) {
        parseMode = client.parseMode;
    } else if (typeof parseMode === "string") {
        parseMode = sanitizeParseMode(parseMode);
    }
    return parseMode.parse(message);
}

/* TODO make your own smh
export function _getResponseMessage(request: Api.AnyRequest, result: Api.TypeUpdates, inputChat: Api.TypeInputPeer) {
    let updates = [];
    let entities = new Map();
    if (result instanceof Api.UpdateShort) {
        updates = [result.update]
    } else if (result instanceof Api.Updates || result instanceof Api.UpdatesCombined) {
        updates = result.updates;
        for (const x of [...result.users, ...result.chats]) {
            entities.set(getPeerId(x), x);
        }
    } else {
        return;
    }
    const randomToId = new Map();
    const idToMessage = new Map();
    const schedToMessage = new Map();
    for (const update of updates) {
        if (update instanceof Api.UpdateMessageID) {
            randomToId.set(update.randomId, update.id);
        } else if (update instanceof Api.UpdateNewChannelMessage || update instanceof Api.UpdateNewMessage) {
            // @ts-ignore
            // TODO update.message._finishInit(this, entities, inputChat);
            if ('randomId' in request || isArrayLike(request)) {
                idToMessage.set(update.message.id, update.message);
            } else {
                return update.message;
            }
        } else if (update instanceof Api.UpdateEditMessage && 'peer' in request && _entityType(request.peer) != _EntityType.CHANNEL) {
            // @ts-ignore
            // TODO update.message._finishInit(this, entities, inputChat);
            if ('randomId' in request) {
                idToMessage.set(update.message.id, update.message);
            } else if ('id' in request && request.id === update.message.id) {
                return update.message;
            }
        } else if (update instanceof Api.UpdateEditChannelMessage &&
            update.message instanceof Api.Message && 'peer' in request && getPeerId(request.peer) == getPeerId(update.message.peerId)) {
            schedToMessage.set(update.message.id, update.message);
        } else if (update instanceof Api.UpdateMessagePoll) {
            if ('media' in request && request.media && "poll" in request.media && request?.media.poll.id == update.pollId) {
                if ('peer' in request) {
                    const peerId = getPeer(request.peer) as Api.TypePeer;
                    const poll = update.poll;
                    if (poll && 'id' in request) {
                        const m = new Api.Message({
                            id: request.id,
                            peerId: peerId,
                            media: new Api.MessageMediaPoll({
                                poll: poll,
                                results: update.results
                            }),
                            message: '',
                            date: 0,
                        });
                        // @ts-ignore
                        m._finishInit(this, entities, inputChat);
                        return m;
                    }
                }
            }
        }

    }
    if (!request) {
        return idToMessage;
    }
    let mapping;
    let opposite = new Map();

    if (!("scheduleDate" in request)) {
        mapping = idToMessage;
    } else {
        mapping = schedToMessage;
        opposite = idToMessage;
    }
    let randomId: any = (typeof request == 'number' || isArrayLike(request)) ? request : 'randomId' in request ? request.randomId : undefined;

    if (randomId === undefined) {
        // TODO add logging
        return null;
    }
    if (!isArrayLike(request)) {
        let msg = mapping.get(randomToId.get(randomId));
        if (!msg) {
            msg = opposite.get(randomToId.get(randomId));
        }
        if (!msg) {
            throw new Error(`Request ${request.className} had missing message mapping`)
            // TODO add logging
        }
        return msg;
    }
    if (isArrayLike((randomId))) {

        const maps = [];
        // @ts-ignore
        for (const rnd of randomId) {
            const d = mapping.get(randomToId.get(rnd));
            const o = opposite.get(randomToId.get(rnd));

            maps.push(d ?? o)

        }
        return maps;
    }
}


*/
