import {getPeer, getPeerId, isArrayLike, sanitizeParseMode} from "../Utils";
import {Api} from "../tl/api";
import {EntityLike} from "../define";
import {_EntityType, _entityType} from "../Helpers";
import {UserMethods} from "./users";

export class MessageParseMethods {
    _parseMode: any;
    get parseMode(): any {
        return this._parseMode;
    }

    set parseMode(mode: any) {
        this._parseMode = sanitizeParseMode(mode);
    }

    async _replaceWithMention(entities: Api.TypeMessageEntity[], i: number, user: EntityLike) {
        try {
            entities[i] = new Api.InputMessageEntityMentionName(
                {
                    offset: entities[i].offset,
                    length: entities[i].length,
                    userId: await this.getInputEntity(user)
                }
            )
            return true;
        } catch (e) {
            return false;
        }
    }

    _parseMessageText(message: string, parseMode: any) {
        if (!parseMode) {
            parseMode = this._parseMode;
        } else if (typeof parseMode === "string") {
            parseMode = sanitizeParseMode(parseMode);
        }
        if (!parseMode) {
            return [message, []]
        }
        return parseMode.parse(message);
    }

    _getResponseMessage(request: Api.AnyRequest, result: Api.TypeUpdates, inputChat: Api.TypeInputPeer) {
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

}

export interface MessageParseMethods extends UserMethods {

}

