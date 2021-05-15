import {Api} from "../tl";
import type {Message} from '../tl/custom/message';
import type {DateLike, EntityLike, FileLike, MarkupLike, MessageIDLike, MessageLike} from "../define";
import {RequestIter} from "../requestIter";
import {_EntityType, _entityType, TotalList, isArrayLike} from "../Helpers";
import {getMessageId, getPeerId} from "../Utils";
import type {TelegramClient} from "../";
import {utils} from "../";

const _MAX_CHUNK_SIZE = 100;


interface MessageIterParams {
    entity: EntityLike;
    offsetId: number;
    minId: number;
    maxId: number;
    fromUser?: EntityLike;
    offsetDate: DateLike;
    addOffset: number;
    filter: any;
    search: string;
    replyTo: MessageIDLike;
}

export class _MessagesIter extends RequestIter {
    private entity?: Api.TypeInputPeer;
    private request?: Api.messages.SearchGlobal | Api.messages.GetReplies | Api.messages.GetHistory | Api.messages.Search;

    async _init({entity, offsetId, minId, maxId, fromUser, offsetDate, addOffset, filter, search, replyTo}: MessageIterParams) {

        if (entity) {
            this.entity = await this.client.getInputEntity(entity);
        } else {
            this.entity = undefined;
            if (this.reverse) {
                throw new Error("Cannot reverse global search");
            }
        }
        if (this.reverse) {
            offsetId = Math.max(offsetId, minId);
            if (offsetId && maxId) {
                if (maxId - offsetId <= 1) {
                    return false;
                }
            }
            if (!maxId) {
                maxId = Number.MAX_SAFE_INTEGER;
            }
        } else {
            offsetId = Math.max(offsetId, maxId);
            if (offsetId && minId) {
                if (offsetId - minId <= 1) {
                    return false;
                }
            }
        }
        if (this.reverse) {
            if (offsetId) {
                offsetId += 1;
            } else if (!offsetDate) {
                offsetId = 1;
            }
        }
        if (fromUser) {
            fromUser = await this.client.getInputEntity(fromUser);
            this.fromId = await this.client.getPeerId(fromUser);
        } else {
            this.fromId = null;
        }

        if (!this.entity && fromUser) {
            this.entity = new Api.InputPeerEmpty();
        }
        if (!filter) {
            filter = new Api.InputMessagesFilterEmpty();
        }
        if (!this.entity) {
            this.request = new Api.messages.SearchGlobal({
                q: search || '',
                filter: filter,
                minDate: undefined,
                // TODO fix this smh
                maxDate: offsetDate,
                offsetRate: undefined,
                offsetPeer: new Api.InputPeerEmpty(),
                offsetId: offsetId,
                limit: 1,
            })
        } else if (replyTo !== undefined) {
            this.request = new Api.messages.GetReplies({
                peer: this.entity,
                msgId: replyTo,
                offsetId: offsetId,
                offsetDate: offsetDate,
                addOffset: addOffset,
                limit: 0,
                maxId: 0,
                minId: 0,
                hash: 0
            });
        } else if (search !== undefined || filter !== undefined || fromUser !== undefined) {
            const ty = _entityType(this.entity);
            if (ty == _EntityType.USER) {
                fromUser = undefined;
            } else {
                this.fromId = undefined;
            }
            this.request = new Api.messages.Search({
                peer: this.entity,
                q: search || '',
                filter: typeof filter === 'function' ? new filter() : filter,
                minDate: undefined,
                maxDate: offsetDate,
                offsetId: offsetId,
                addOffset: addOffset,
                limit: 0,
                maxId: 0,
                minId: 0,
                hash: 0,
                fromId: fromUser
            });
            if (filter instanceof Api.InputMessagesFilterEmpty && offsetDate && !search && !offsetId) {
                for await (const m of this.client.iterMessages(this.entity, {limit: 1, offsetDate: offsetDate})) {
                    this.request.offsetId = m.id + 1;
                }
            }
        } else {
            this.request = new Api.messages.GetHistory({
                peer: this.entity,
                limit: 1,
                offsetDate: offsetDate,
                offsetId: offsetId,
                minId: 0,
                maxId: 0,
                addOffset: addOffset,
                hash: 0
            })
        }
        if (this.limit <= 0) {
            const result = await this.client.invoke(this.request);
            if (result instanceof Api.messages.MessagesNotModified) {
                this.total = result.count;
            } else {
                if ("count" in result) {
                    this.total = result.count
                } else {
                    this.total = result.messages.length
                }
            }
            return false;
        }
        if (!this.waitTime) {
            this.waitTime = this.limit > 3000 ? 1 : 0;
        }
        if (this.reverse && !(this.request instanceof Api.messages.SearchGlobal)) {
            this.request.addOffset -= _MAX_CHUNK_SIZE;
        }
        this.addOffset = addOffset;
        this.maxId = maxId;
        this.minId = minId;
        this.lastId = this.reverse ? 0 : Number.MAX_SAFE_INTEGER;

    }

    async _loadNextChunk() {
        if (!this.request) {
            throw new Error("Request not set yet");
        }
        this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
        if (this.reverse && this.request.limit != _MAX_CHUNK_SIZE) {
            if (!(this.request instanceof Api.messages.SearchGlobal)) {
                this.request.addOffset = this.addOffset - this.request.limit;
            }
        }
        const r = await this.client.invoke(this.request);
        if (r instanceof Api.messages.MessagesNotModified) {
            return true;
        }
        if ("count" in r) {
            this.total = r.count
        } else {
            this.total = r.messages.length
        }

        const entities = new Map();

        for (const x of [...r.users, ...r.chats]) {
            entities.set(getPeerId(x), x);
        }
        const messages: Message[] = this.reverse ? r.messages.reverse() as unknown as Message[] : r.messages as unknown as Message[];
        for (const message of messages) {
            if ((this.fromId && message.senderId != this.fromId)) {
                continue;
            }
            if (!this._messageInRange(message)) {
                return true;
            }
            this.lastId = message.id;
            try {
                // if this fails it shouldn't be a big problem
                message._finishInit(this.client, entities, this.entity);
            } catch (e) {

            }
            this.buffer?.push(message);
        }
        if (r.messages.length < this.request.limit) {
            return true;
        }

        if (this.buffer) {
            this._updateOffset(this.buffer[this.buffer.length - 1], r)
        } else {
            return true;
        }
    }

    _messageInRange(message: Message) {
        if (this.entity) {
            if (this.reverse) {
                if (message.id <= this.lastId || message.id >= this.maxId) {
                    return false;
                }
            } else {
                if (message.id >= this.lastId || message.id <= this.minId) {
                    return false;
                }
            }
        }
        return true;
    }

    [Symbol.asyncIterator](): AsyncIterator<Message, any, undefined> {
        return super[Symbol.asyncIterator]();
    }

    _updateOffset(lastMessage: Message, response: any) {
        if (!this.request) {
            throw new Error("Request not set yet");
        }
        this.request.offsetId = Number(lastMessage.id);
        if (this.reverse) {
            this.request.offsetId += 1;
        }
        if (this.request instanceof Api.messages.Search) {
            this.request.maxDate = -1;
        } else {
            if (!(this.request instanceof Api.messages.SearchGlobal)) {
                this.request.offsetDate = lastMessage.date;
            }
        }
        if (this.request instanceof Api.messages.SearchGlobal) {
            if (lastMessage.inputChat) {
                this.request.offsetPeer = lastMessage.inputChat;
            } else {
                this.request.offsetPeer = new Api.InputPeerEmpty();
            }
            this.request.offsetRate = response.nextRate;
        }
    }
}

interface IDsIterInterface {
    entity: EntityLike,
    ids: MessageLike[]
}

export class _IDsIter extends RequestIter {
    async _init({entity, ids}: IDsIterInterface) {
        this.total = ids.length;
        this._ids = this.reverse ? ids.reverse() : ids;
        this._offset = 0;
        this._entity = entity ? (await this.client.getInputEntity(entity)) : undefined;
        this._ty = this._entity ? _entityType(this._entity) : undefined;


        if (!this.waitTime) {
            this.waitTile = this.limit > 300 ? 10 : 0;
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<Message, any, undefined> {
        return super[Symbol.asyncIterator]();
    }

    async _loadNextChunk() {
        const ids = this._ids.slice(this._offset, this._offset + _MAX_CHUNK_SIZE);
        if (!ids.length) {
            return false;
        }
        this._offset += _MAX_CHUNK_SIZE;
        let fromId;
        let r;

        if (this._ty == _EntityType.CHANNEL) {
            try {
                r = await this.client.invoke(new Api.channels.GetMessages({
                    channel: this._entity,
                    id: ids
                }));
            } catch (e) {
                if (e.message == "MESSAGE_IDS_EMPTY") {
                    r = new Api.messages.MessagesNotModified({
                        count: ids.length
                    });
                } else {
                    throw e;
                }
            }
        } else {
            r = await this.client.invoke(new Api.messages.GetMessages({
                id: ids
            }));
            if (this._entity) {
                fromId = await this.client._getPeer(this.entity);
            }
        }
        if (r instanceof Api.messages.MessagesNotModified) {
            this.buffer?.push(...Array(ids.length));
            return
        }
        const entities = new Map();
        for (const entity of [...r.users, ...r.chats]) {
            entities.set(utils.getPeerId(entity), entity);
        }
        let message: Api.TypeMessage;
        for (message of r.messages) {
            if (message instanceof Api.MessageEmpty || fromId && message.peerId != fromId) {
                this.buffer?.push(undefined)
            } else {
                this.buffer?.push(message);
            }
        }
    }
}

export interface IterMessagesParams {
    limit?: number;
    offsetDate?: DateLike;
    offsetId?: number;
    maxId?: number;
    minId?: number;
    addOffset?: number;
    search?: string;
    filter?: Api.TypeMessagesFilter | Api.TypeMessagesFilter[];
    fromUser?: EntityLike;
    waitTime?: number;
    ids?: number | number[];
    reverse?: boolean;
    replyTo?: number;
}

export interface SendMessageParams {
    message: MessageLike;
    replyTo?: number | Api.Message;
    parseMode?: any;
    formattingEntities?: Api.TypeMessageEntity[];
    linkPreview?: boolean;
    file?: FileLike | FileLike[];
    forceDocument?: false;
    clearDraft?: false;
    buttons?: MarkupLike;
    silent?: boolean;
    schedule?: DateLike;
}

export interface EditMessageParams {
    message: Api.Message | number;
    text: string;
    parseMode?: any;
    formattingEntities?: Api.TypeMessageEntity[];
    linkPreview?: boolean;
    file?: FileLike | FileLike[];
    forceDocument?: false;
    buttons?: MarkupLike;
    schedule?: DateLike;
}

//  MessageMethods {

export function iterMessages(client: TelegramClient, entity: EntityLike, {limit, offsetDate, offsetId, maxId, minId, addOffset, search, filter, fromUser, waitTime, ids, reverse = false, replyTo}: IterMessagesParams) {
    if (ids) {
        if (typeof ids == 'number') {
            ids = [ids]
        }
        return new _IDsIter(client, ids.length, {
            reverse: reverse,
            waitTime: waitTime
        }, {
            entity: entity,
            ids: ids
        });
    }
    return new _MessagesIter(client, limit || 1, {
        waitTime: waitTime,
        reverse: reverse
    }, {
        entity: entity,
        offsetId: offsetId,
        minId: minId,
        maxId: maxId,
        fromUser: fromUser,
        offsetDate: offsetDate,
        addOffset: addOffset,
        filter: filter,
        search: search,
        replyTo: replyTo
    })
}

export async function getMessages(client: TelegramClient, entity: EntityLike, params: IterMessagesParams): Promise<TotalList<Message>> {
    if (Object.keys(params).length == 1 && params.limit === undefined) {
        if (params.minId === undefined && params.maxId === undefined) {
            params.limit = undefined;
        } else {
            params.limit = 1;
        }
    }

    const it = client.iterMessages(entity, params);
    const ids = params.ids;
    if (ids && !isArrayLike(ids)) {
        for await (const message of it) {
            return [message];
        }
        return [];

    }
    return await it.collect() as TotalList<Message>;
}

// region Message

export async function sendMessage(client: TelegramClient,
                                  entity: EntityLike,
                                  {
                                      message,
                                      replyTo,
                                      parseMode, formattingEntities,
                                      linkPreview = true,
                                      file, forceDocument,
                                      clearDraft,
                                      buttons,
                                      silent,
                                      schedule
                                  }: SendMessageParams) {
    if (file) {
        throw new Error("Not Supported Yet");
        //return this.sendFile();
    }
    entity = await client.getInputEntity(entity);
    let markup, request;
    if (message instanceof Api.Message) {
        if (buttons == undefined) {
            markup = message.replyMarkup;
        } else {
            markup = client.buildReplyMarkup(buttons);
        }
        if (silent == undefined) {
            silent = message.silent;
        }
        if (message.media && !(message.media instanceof Api.MessageMediaWebPage)) {
            throw new Error("Not Supported Yet");
            /*
                            return this.sendFile(entity, message.media, {
                                caption: message.message,
                                silent: silent,
                                replyTo: replyTo,
                                buttons: markup,
                                formattingEntities: message.entities,
                                schedule: schedule
                            })

             */
        }
        request = new Api.messages.SendMessage({
            peer: entity,
            message: message.message || '',
            silent: silent,
            replyToMsgId: getMessageId(replyTo),
            replyMarkup: markup,
            entities: message.entities,
            clearDraft: clearDraft,
            noWebpage: !(message.media instanceof Api.MessageMediaWebPage),
            scheduleDate: schedule
        })
        message = message.message;
    } else {
        if (formattingEntities == undefined) {
            [message, formattingEntities] = await client._parseMessageText(message, parseMode);
        }
        if (!message) {
            throw new Error("The message cannot be empty unless a file is provided");
        }
        request = new Api.messages.SendMessage({
            peer: entity,
            message: message.toString(),
            entities: formattingEntities,
            noWebpage: !linkPreview,
            replyToMsgId: getMessageId(replyTo),
            clearDraft: clearDraft,
            silent: silent,
            replyMarkup: client.buildReplyMarkup(buttons),
            scheduleDate: schedule
        })
    }
    const result = await client.invoke(request);
    return result;
    //return client._getResponseMessage(request, result, entity);
}

/**
 * Used to edit a message by changing it's text or media
 * message refers to the message to be edited not what to edit
 * text refers to the new text
 */
export async function editMessage(client: TelegramClient,
                                  entity: EntityLike,
                                  {
                                      message,
                                      text,
                                      parseMode,
                                      formattingEntities,
                                      linkPreview = true,
                                      file,
                                      forceDocument,
                                      buttons,
                                      schedule
                                  }: EditMessageParams) {

    entity = await client.getInputEntity(entity);
    if (formattingEntities == undefined) {
        [text, formattingEntities] = await client._parseMessageText(text, parseMode);
    }
    const msg = await client.invoke(new Api.messages.EditMessage({
        peer:entity,
        id:utils.getMessageId(message),
        message:text,
        noWebpage:!linkPreview,
        entities:formattingEntities,
        //media: no media for now,
        replyMarkup:client.buildReplyMarkup(buttons),
        scheduleDate:schedule,
    }));
    return msg;
    //return client._getResponseMessage(request, result, entity);
}

// TODO do the rest
