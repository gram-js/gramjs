import { Api } from "../tl";
import { Message } from "../tl/custom/message";
import type {
    DateLike,
    EntityLike,
    FileLike,
    MarkupLike,
    MessageIDLike,
    MessageLike
} from "../define";
import { RequestIter } from "../requestIter";
import {
    _EntityType,
    _entityType,
    TotalList,
    isArrayLike,
    groupBy
} from "../Helpers";
import { getMessageId, getPeerId } from "../Utils";
import type { TelegramClient } from "../";
import { utils } from "../";
import { _parseMessageText } from "./messageParse";
import { _getPeer } from "./users";

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
    entity?: Api.TypeInputPeer;
    request?:
        | Api.messages.SearchGlobal
        | Api.messages.GetReplies
        | Api.messages.GetHistory
        | Api.messages.Search;
    fromId?: number;
    addOffset?: number;
    maxId?: number;
    minId?: number;
    lastId?: number;

    async _init({
                    entity,
                    offsetId,
                    minId,
                    maxId,
                    fromUser,
                    offsetDate,
                    addOffset,
                    filter,
                    search,
                    replyTo
                }: MessageIterParams) {
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
            this.fromId = undefined;
        }

        if (!this.entity && fromUser) {
            this.entity = new Api.InputPeerEmpty();
        }
        if (!filter) {
            filter = new Api.InputMessagesFilterEmpty();
        }
        if (!this.entity) {
            this.request = new Api.messages.SearchGlobal({
                q: search || "",
                filter: filter,
                minDate: undefined,
                // TODO fix this smh
                maxDate: offsetDate,
                offsetRate: undefined,
                offsetPeer: new Api.InputPeerEmpty(),
                offsetId: offsetId,
                limit: 1
            });
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
        } else if (
            search !== undefined ||
            filter !== undefined ||
            fromUser !== undefined
        ) {
            const ty = _entityType(this.entity);
            if (ty == _EntityType.USER) {
                fromUser = undefined;
            } else {
                this.fromId = undefined;
            }
            this.request = new Api.messages.Search({
                peer: this.entity,
                q: search || "",
                filter: typeof filter === "function" ? new filter() : filter,
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
            if (
                filter instanceof Api.InputMessagesFilterEmpty &&
                offsetDate &&
                !search &&
                !offsetId
            ) {
                for await (const m of this.client.iterMessages(this.entity, {
                    limit: 1,
                    offsetDate: offsetDate
                })) {
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
            });
        }
        if (this.limit <= 0) {
            const result = await this.client.invoke(this.request);
            if (result instanceof Api.messages.MessagesNotModified) {
                this.total = result.count;
            } else {
                if ("count" in result) {
                    this.total = result.count;
                } else {
                    this.total = result.messages.length;
                }
            }
            return false;
        }
        if (!this.waitTime) {
            this.waitTime = this.limit > 3000 ? 1 : 0;
        }
        if (
            this.reverse &&
            !(this.request instanceof Api.messages.SearchGlobal)
        ) {
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
                this.request.addOffset = this.addOffset! - this.request.limit;
            }
        }
        const r = await this.client.invoke(this.request);
        if (r instanceof Api.messages.MessagesNotModified) {
            return true;
        }
        if ("count" in r) {
            this.total = r.count;
        } else {
            this.total = r.messages.length;
        }

        const entities = new Map();

        for (const x of [...r.users, ...r.chats]) {
            entities.set(getPeerId(x), x);
        }
        const messages: Message[] = this.reverse
            ? (r.messages.reverse() as unknown as Message[])
            : (r.messages as unknown as Message[]);
        for (const message of messages) {
            if (this.fromId && message.senderId != this.fromId) {
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
            message._entities = entities;
            this.buffer?.push(message);
        }
        if (r.messages.length < this.request.limit) {
            return true;
        }

        if (this.buffer) {
            this._updateOffset(this.buffer[this.buffer.length - 1], r);
        } else {
            return true;
        }
    }

    _messageInRange(message: Message) {
        if (this.entity) {
            if (this.reverse) {
                if (message.id <= this.lastId! || message.id >= this.maxId!) {
                    return false;
                }
            } else {
                if (message.id >= this.lastId! || message.id <= this.minId!) {
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
                this.request.offsetDate = lastMessage.date!;
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
    entity: EntityLike;
    ids: Api.TypeInputMessage[];
}

export class _IDsIter extends RequestIter {
    _ids?: Api.TypeInputMessage[];
    _offset?: number;
    _ty: number | undefined;
    private _entity: Api.TypeInputPeer | undefined;

    async _init({ entity, ids }: IDsIterInterface) {
        this.total = ids.length;
        this._ids = this.reverse ? ids.reverse() : ids;
        this._offset = 0;
        this._entity = entity
            ? await this.client.getInputEntity(entity)
            : undefined;
        this._ty = this._entity ? _entityType(this._entity) : undefined;

        if (!this.waitTime) {
            this.waitTime = this.limit > 300 ? 10 : 0;
        }
    }

    [Symbol.asyncIterator](): AsyncIterator<Message, any, undefined> {
        return super[Symbol.asyncIterator]();
    }

    async _loadNextChunk() {
        const ids = this._ids!.slice(
            this._offset,
            this._offset! + _MAX_CHUNK_SIZE
        );
        if (!ids.length) {
            return false;
        }
        this._offset! += _MAX_CHUNK_SIZE;
        let fromId;
        let r;
        if (this._ty == _EntityType.CHANNEL) {
            try {
                r = await this.client.invoke(
                    new Api.channels.GetMessages({
                        channel: this._entity,
                        id: ids
                    })
                );
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
            r = await this.client.invoke(
                new Api.messages.GetMessages({
                    id: ids
                })
            );
            if (this._entity) {
                fromId = await _getPeer(this.client, this._entity);
            }
        }
        if (r instanceof Api.messages.MessagesNotModified) {
            this.buffer?.push(...Array(ids.length));
            return;
        }
        const entities = new Map();
        for (const entity of [...r.users, ...r.chats]) {
            entities.set(utils.getPeerId(entity), entity);
        }
        let message: Api.TypeMessage;
        for (message of r.messages) {
            if (
                message instanceof Api.MessageEmpty ||
                (fromId &&
                    utils.getPeerId(message.peerId) != utils.getPeerId(fromId))
            ) {
                this.buffer?.push(undefined);
            } else {
                const temp: Message = message as unknown as Message;
                temp._finishInit(this.client, entities, this._entity);
                temp._entities = entities;
                this.buffer?.push(temp);
            }
        }
    }
}

 /**
 * Interface for iterating over messages. used in both {@link iterMessages} and {@link getMessages}.
 */
export interface IterMessagesParams {
    /** Number of messages to be retrieved.<br/>
     * Due to limitations with the API retrieving more than 3000 messages will take longer than half a minute. (might even take longer)<br/>
     * if undefined is passed instead of a number the library will try to retrieve all the messages.*/
    limit?: number;
    /** Offset date (messages previous to this date will be retrieved). Exclusive. */
    offsetDate?: DateLike;
    /** Offset message ID (only messages previous to the given ID will be retrieved). Exclusive. */
    offsetId?: number;
    /** All the messages with a higher (newer) ID or equal to this will be excluded. */
    maxId?: number;
    /** All the messages with a lower (older) ID or equal to this will be excluded. */
    minId?: number;
    /** Additional message offset (all of the specified offsets + this offset = older messages). */
    addOffset?: number;
    /** The string to be used as a search query. */
    search?: string;
    /** The filter to use when returning messages.<br/>
     * For instance, InputMessagesFilterPhotos would yield only messages containing photos.
     */
    filter?: Api.TypeMessagesFilter | Api.TypeMessagesFilter[];
    /** Only messages from this user will be returned. */
    fromUser?: EntityLike;
    /** Wait time (in seconds) between different GetHistory requests.<br/>
     * Use this parameter to avoid hitting the FloodWaitError as needed.<br/>
     * If left to undefined, it will default to 1 second only if the number of messages is higher than 3000.
     * If the ids parameter is used, this time will default to 10 seconds only if the amount of IDs is higher than 300.
     */
    waitTime?: number;
    /** A single integer ID (or several IDs) for the message that should be returned.<br/>
     * This parameter takes precedence over the rest (which will be ignored if this is set).<br/>
     * This can for instance be used to get the message with ID 123 from a channel.<br/>
     * **Note** that if the message doesn"t exist, undefined will appear in its place.
     */
    ids?: number | number[] | Api.TypeInputMessage | Api.TypeInputMessage[];
    /** If set to `true`, the messages will be returned in reverse order (from oldest to newest, instead of the default newest to oldest).<br/>
     * This also means that the meaning of offsetId and offsetDate parameters is reversed, although they will still be exclusive.<br/>
     * `minId` becomes equivalent to `offsetId` instead of being `maxId` as well since messages are returned in ascending order.<br/>
     * You cannot use this if both entity and ids are undefined.
     */
    reverse?: boolean;
    /** If set to a message ID, the messages that reply to this ID will be returned.<br/>
     * This feature is also known as comments in posts of broadcast channels, or viewing threads in groups.<br/>
     * This feature can only be used in broadcast channels and their linked supergroups. Using it in a chat or private conversation will result in PEER_ID_INVALID error.<br/>
     * When using this parameter, the filter and search parameters have no effect, since Telegram's API doesn't support searching messages in replies.
     */
    replyTo?: number;
}

/**
 * Interface for sending a message. only message is required
 */
export interface SendMessageParams {
    /**  The message to be sent, or another message object to resend as a copy.<br/>
     * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
     * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
    message: MessageLike;
    /** Whether to reply to a message or not. If an integer is provided, it should be the ID of the message that it should reply to. */
    replyTo?: number | Api.Message;
    /** Optional attributes that override the inferred ones, like DocumentAttributeFilename and so on. */
    attributes?: Api.TypeDocumentAttribute[];
    /** See the {@link parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Should the link preview be shown? */
    linkPreview?: boolean;
    /** Sends a message with a file attached (e.g. a photo, video, audio or document). The message may be empty. */
    file?: FileLike;
    /** Optional JPEG thumbnail (for documents). Telegram will ignore this parameter unless you pass a .jpg file!<br/>
     * The file must also be small in dimensions and in disk size. Successful thumbnails were files below 20kB and 320x320px.<br/>
     *  Width/height and dimensions/size ratios may be important.
     *  For Telegram to accept a thumbnail, you must provide the dimensions of the underlying media through `attributes:` with DocumentAttributesVideo.
     */
    thumb?: FileLike;
    /** Whether to send the given file as a document or not. */
    forceDocument?: false;
    /** Whether the existing draft should be cleared or not. */
    clearDraft?: false;
    /** The matrix (list of lists), row list or button to be shown after sending the message.<br/>
     *  This parameter will only work if you have signed in as a bot. You can also pass your own ReplyMarkup here.<br/>
     *  <br/>
     *  All the following limits apply together:
     *   - There can be 100 buttons at most (any more are ignored).
     *   - There can be 8 buttons per row at most (more are ignored).
     *   - The maximum callback data per button is 64 bytes.
     *   - The maximum data that can be embedded in total is just over 4KB, shared between inline callback data and text.
     */
    buttons?: MarkupLike;
    /** Whether the message should notify people in a broadcast channel or not. Defaults to false, which means it will notify them. Set it to True to alter this behaviour. */
    silent?: boolean;
    /** Whether the sent video supports streaming or not.<br/>
     *  Note that Telegram only recognizes as streamable some formats like MP4, and others like AVI or MKV will not work.<br/>
     *  You should convert these to MP4 before sending if you want them to be streamable. Unsupported formats will result in VideoContentTypeError. */
    supportStreaming?: boolean;
    /** If set, the message won't send immediately, and instead it will be scheduled to be automatically sent at a later time. */
    schedule?: DateLike;
}

/** interface used for forwarding messages */
export interface ForwardMessagesParams {
    /** The message(s) to forward, or their integer IDs. */
    messages: MessageIDLike[];
    /** If the given messages are integer IDs and not instances of the Message class, this must be specified in order for the forward to work.<br/> */
    fromPeer: EntityLike;
    /** Whether the message should notify people with sound or not.<br/>
     * Defaults to false (send with a notification sound unless the person has the chat muted). Set it to true to alter this behaviour. */
    silent?: boolean;
    /** If set, the message(s) won't forward immediately, and instead they will be scheduled to be automatically sent at a later time. */
    schedule?: DateLike;
}

/** Interface for editing messages */
export interface EditMessageParams {
    /** The ID of the message (or Message itself) to be edited. If the entity was a Message, then this message will be treated as the new text. */
    message: Api.Message | number;
    /** The new text of the message. Does nothing if the entity was a Message. */
    text: string;
    /** See the {@link TelegramClient.parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Should the link preview be shown? */
    linkPreview?: boolean;
    /** The file object that should replace the existing media in the message. // not supported yet. */
    file?: FileLike | FileLike[];
    /** thumbnail to be edited. // not supported yet */
    forceDocument?: false;
    /** The matrix (list of lists), row list or button to be shown after sending the message.<br/>
     *  This parameter will only work if you have signed in as a bot. You can also pass your own ReplyMarkup here.<br/>
     *  <br/>
     *  All the following limits apply together:
     *   - There can be 100 buttons at most (any more are ignored).
     *   - There can be 8 buttons per row at most (more are ignored).
     *   - The maximum callback data per button is 64 bytes.
     *   - The maximum data that can be embedded in total is just over 4KB, shared between inline callback data and text.
     */
    buttons?: MarkupLike;
    /** If set, the message won't be edited immediately, and instead it will be scheduled to be automatically edited at a later time. */
    schedule?: DateLike;
}

//  MessageMethods
export function iterMessages(
    client: TelegramClient,
    entity: EntityLike | undefined,
    {
        limit,
        offsetDate,
        offsetId,
        maxId,
        minId,
        addOffset,
        search,
        filter,
        fromUser,
        waitTime,
        ids,
        reverse = false,
        replyTo
    }: IterMessagesParams
) {
    if (ids) {
        let idsArray;
        if (!isArrayLike(ids)) {
            idsArray = [ids];
        } else {
            idsArray = ids;
        }
        return new _IDsIter(
            client,
            idsArray.length,
            {
                reverse: reverse,
                waitTime: waitTime
            },
            {
                entity: entity,
                ids: idsArray
            }
        );
    }
    return new _MessagesIter(
        client,
        limit || 1,
        {
            waitTime: waitTime,
            reverse: reverse
        },
        {
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
        }
    );
}

/** @hidden */
export async function getMessages(
    client: TelegramClient,
    entity: EntityLike | undefined,
    params: IterMessagesParams
): Promise<TotalList<Message>> {
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
    return (await it.collect()) as TotalList<Message>;
}

// region Message
/** @hidden */
export async function sendMessage(
    client: TelegramClient,
    entity: EntityLike,
    {
        message,
        replyTo,
        attributes,
        parseMode,
        formattingEntities,
        linkPreview = true,
        file,
        thumb,
        forceDocument,
        clearDraft,
        buttons,
        silent,
        supportStreaming,
        schedule
    }: SendMessageParams
) {
    if (file) {
        return client.sendFile(entity, {
            file: file,
            caption: message ? (typeof message == "string" ? message : message.message) : "",
            forceDocument: forceDocument,
            clearDraft: clearDraft,
            replyTo: replyTo,
            attributes: attributes,
            thumb: thumb,
            supportsStreaming: supportStreaming,
            parseMode: parseMode,
            formattingEntities: formattingEntities,
            silent: silent,
            scheduleDate: schedule,
            buttons: buttons
        });

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
        if (
            message.media &&
            !(message.media instanceof Api.MessageMediaWebPage)
        ) {
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
            message: message.message || "",
            silent: silent,
            replyToMsgId: getMessageId(replyTo),
            replyMarkup: markup,
            entities: message.entities,
            clearDraft: clearDraft,
            noWebpage: !(message.media instanceof Api.MessageMediaWebPage),
            scheduleDate: schedule
        });
        message = message.message;
    } else {
        if (formattingEntities == undefined) {
            [message, formattingEntities] = _parseMessageText(
                client,
                message,
                parseMode
            );
        }
        if (!message) {
            throw new Error(
                "The message cannot be empty unless a file is provided"
            );
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
        });
    }
    const result = await client.invoke(request);
    if (result instanceof Api.UpdateShortSentMessage) {
        const msg = new Message({
            id: result.id,
            peerId: await _getPeer(client, entity),
            message: message,
            date: result.date,
            out: result.out,
            media: result.media,
            entities: result.entities,
            replyMarkup: request.replyMarkup,
            ttlPeriod: result.ttlPeriod
        });
        msg._finishInit(client, new Map(), entity);
        return msg;
    }
    return client._getResponseMessage(request, result, entity) as Message;
}

/** @hidden */
export async function forwardMessages(
    client: TelegramClient,
    entity: EntityLike,
    { messages, fromPeer, silent, schedule }: ForwardMessagesParams
) {
    entity = await client.getInputEntity(entity);
    let fromPeerId: number | undefined;
    if (fromPeer) {
        fromPeer = await client.getInputEntity(fromPeer);
        fromPeerId = await client.getPeerId(fromPeer);
    }
    const getKey = (m: number | Message) => {
        if (typeof m == "number") {
            if (fromPeerId !== undefined) {
                return fromPeerId;
            }
            throw new Error("fromPeer must be given if integer IDs are used");
        } else if (m instanceof Api.Message) {
            return m.chatId;
        } else {
            throw new Error(`Cannot forward ${m}`);
        }
    };
    const sent: Message[] = [];
    for (let [chatId, chunk] of groupBy(messages, getKey) as Map<number,
        Message[] | number[]>) {
        let chat;
        let numbers: number[] = [];
        if (typeof chunk[0] == "number") {
            chat = fromPeer;
            numbers = chunk as number[];
        } else {
            chat = await chunk[0].getInputChat();
            numbers = (chunk as Message[]).map((m: Message) => m.id);
        }
        chunk.push();
        const request = new Api.messages.ForwardMessages({
            fromPeer: chat,
            id: numbers,
            toPeer: entity,
            silent: silent,
            scheduleDate: schedule
        });
        const result = await client.invoke(request);
        sent.push(
            client._getResponseMessage(request, result, entity) as Message
        );
    }
    return sent;
}

/** @hidden */
export async function editMessage(
    client: TelegramClient,
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
    }: EditMessageParams
) {
    entity = await client.getInputEntity(entity);
    if (formattingEntities == undefined) {
        [text, formattingEntities] = _parseMessageText(
            client,
            text,
            parseMode
        );
    }
    const request = new Api.messages.EditMessage({
        peer: entity,
        id: utils.getMessageId(message),
        message: text,
        noWebpage: !linkPreview,
        entities: formattingEntities,
        //media: no media for now,
        replyMarkup: client.buildReplyMarkup(buttons),
        scheduleDate: schedule
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity) as Message;
}

// TODO do the rest
