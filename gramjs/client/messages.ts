import { Api } from "../tl";
import type {
    DateLike,
    EntityLike,
    FileLike,
    MarkupLike,
    MessageIDLike,
    MessageLike,
} from "../define";
import { RequestIter } from "../requestIter";
import {
    _EntityType,
    _entityType,
    TotalList,
    isArrayLike,
    groupBy,
    generateRandomBigInt,
} from "../Helpers";
import { getInputMedia, getMessageId, getPeerId, parseID } from "../Utils";
import type { TelegramClient } from "../";
import { utils } from "../";
import { _parseMessageText } from "./messageParse";
import { _getPeer } from "./users";
import bigInt from "big-integer";
import { _fileToMedia } from "./uploads";

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
        replyTo,
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
                limit: 1,
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
                hash: bigInt.zero,
            });
        } else if (
            search !== undefined ||
            !(filter instanceof Api.InputMessagesFilterEmpty) ||
            fromUser !== undefined
        ) {
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
                hash: generateRandomBigInt(),
                fromId: fromUser,
            });
            if (
                !(filter instanceof Api.InputMessagesFilterEmpty) &&
                offsetDate &&
                !search &&
                !offsetId
            ) {
                for await (const m of this.client.iterMessages(this.entity, {
                    limit: 1,
                    offsetDate: offsetDate,
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
                hash: bigInt.zero,
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
        const messages: Api.Message[] = this.reverse
            ? (r.messages.reverse() as unknown as Api.Message[])
            : (r.messages as unknown as Api.Message[]);
        for (const message of messages) {
            if (!this._messageInRange(message)) {
                return true;
            }
            this.lastId = message.id;
            try {
                // if this fails it shouldn't be a big problem
                message._finishInit(this.client, entities, this.entity);
            } catch (e) {}
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

    _messageInRange(message: Api.Message) {
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

    [Symbol.asyncIterator](): AsyncIterator<Api.Message, any, undefined> {
        return super[Symbol.asyncIterator]();
    }

    _updateOffset(lastMessage: Api.Message, response: any) {
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

    [Symbol.asyncIterator](): AsyncIterator<Api.Message, any, undefined> {
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
                        id: ids,
                    })
                );
            } catch (e: any) {
                if (e.errorMessage == "MESSAGE_IDS_EMPTY") {
                    r = new Api.messages.MessagesNotModified({
                        count: ids.length,
                    });
                } else {
                    throw e;
                }
            }
        } else {
            r = await this.client.invoke(
                new Api.messages.GetMessages({
                    id: ids,
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
                const temp: Api.Message = message as unknown as Api.Message;
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
    offsetId: number;
    /** All the messages with a higher (newer) ID or equal to this will be excluded. */
    maxId: number;
    /** All the messages with a lower (older) ID or equal to this will be excluded. */
    minId: number;
    /** Additional message offset (all of the specified offsets + this offset = older messages). */
    addOffset: number;
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
    /** If set to `true`, messages which are scheduled will be returned.
     *  All other parameters will be ignored for this, except `entity`.
     */
    scheduled: boolean;
}

const IterMessagesDefaults: IterMessagesParams = {
    limit: undefined,
    offsetDate: undefined,
    offsetId: 0,
    maxId: 0,
    minId: 0,
    addOffset: 0,
    search: undefined,
    filter: undefined,
    fromUser: undefined,
    waitTime: undefined,
    ids: undefined,
    reverse: false,
    replyTo: undefined,
    scheduled: false,
};

/**
 * Interface for sending a message. only message is required
 */
export interface SendMessageParams {
    /**  The message to be sent, or another message object to resend as a copy.<br/>
     * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
     * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
    message?: MessageLike;
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
    file?: FileLike | FileLike[];
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
    noforwards?: boolean;
    /** Similar to ``replyTo``, but replies in the linked group of a broadcast channel instead (effectively leaving a "comment to" the specified message).

     This parameter takes precedence over ``replyTo``.
     If there is no linked chat, `SG_ID_INVALID` is thrown.
     */
    commentTo?: number | Api.Message;
    /**
     * Used for threads to reply to a specific thread
     */
    topMsgId?: number | Api.Message;
}

/** interface used for forwarding messages */
export interface ForwardMessagesParams {
    /** The message(s) to forward, or their integer IDs. */
    messages: MessageIDLike | MessageIDLike[];
    /** If the given messages are integer IDs and not instances of the Message class, this must be specified in order for the forward to work.<br/> */
    fromPeer: EntityLike;
    /** Whether the message should notify people with sound or not.<br/>
     * Defaults to false (send with a notification sound unless the person has the chat muted). Set it to true to alter this behaviour. */
    silent?: boolean;
    /** If set, the message(s) won't forward immediately, and instead they will be scheduled to be automatically sent at a later time. */
    schedule?: DateLike;
    dropAuthor?: boolean;
    noforwards?: boolean;
}

/** Interface for editing messages */
export interface EditMessageParams {
    /** The ID of the message (or Message itself) to be edited. If the entity was a Message, then this message will be treated as the new text. */
    message: Api.Message | number;
    /** The new text of the message. Does nothing if the entity was a Message. */
    text?: string;
    /** See the {@link TelegramClient.parseMode} property for allowed values. Markdown parsing will be used by default. */
    parseMode?: any;
    /** A list of message formatting entities. When provided, the parseMode is ignored. */
    formattingEntities?: Api.TypeMessageEntity[];
    /** Should the link preview be shown? */
    linkPreview?: boolean;
    /** The file object that should replace the existing media in the message. Does nothing if entity was a Message */
    file?: FileLike;
    /** Whether to send the given file as a document or not. */
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

/** Interface for editing messages */
export interface UpdatePinMessageParams {
    /** Whether the pin should notify people or not. <br />
     *  By default it has the opposite behavior of official clients, it will not notify members.
     */
    notify?: boolean;
    /** Whether the message should be pinned for everyone or not. <br />
     *  By default it has the opposite behavior of official clients, and it will pin the message for both sides, in private chats.
     */
    pmOneSide?: boolean;
}

/** Interface for mark message as read */
export interface MarkAsReadParams {
    /**
     * Until which message should the read acknowledge be sent for. <br />
     * This has priority over the `message` parameter.
     */
    maxId?: number;
    /**
     * Whether the mention badge should be cleared (so that there are no more mentions) or not for the given entity. <br />
     * If no message is provided, this will be the only action taken.
     */
    clearMentions?: boolean;
}

/** @hidden */
export function iterMessages(
    client: TelegramClient,
    entity: EntityLike | undefined,
    options: Partial<IterMessagesParams>
) {
    const {
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
        reverse,
        replyTo,
    } = { ...IterMessagesDefaults, ...options };
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
                waitTime: waitTime,
            },
            {
                entity: entity,
                ids: idsArray,
            }
        );
    }
    return new _MessagesIter(
        client,
        limit,
        {
            waitTime: waitTime,
            reverse: reverse,
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
            replyTo: replyTo,
        }
    );
}

/** @hidden */
export async function getMessages(
    client: TelegramClient,
    entity: EntityLike | undefined,
    params: Partial<IterMessagesParams>
): Promise<TotalList<Api.Message>> {
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
    return (await it.collect()) as TotalList<Api.Message>;
}

// region Message
/** @hidden */
export async function sendMessage(
    client: TelegramClient,
    /** To who will it be sent. */
    entity: EntityLike,
    /**  The message to be sent, or another message object to resend as a copy.<br/>
     * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
     * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
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
        schedule,
        noforwards,
        commentTo,
        topMsgId,
    }: SendMessageParams = {}
) {
    if (file) {
        return client.sendFile(entity, {
            file: file,
            caption: message
                ? typeof message == "string"
                    ? message
                    : message.message
                : "",
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
            buttons: buttons,
            noforwards: noforwards,
            commentTo: commentTo,
            topMsgId: topMsgId,
        });
    }
    entity = await client.getInputEntity(entity);
    if (commentTo != undefined) {
        const discussionData = await getCommentData(client, entity, commentTo);
        entity = discussionData.entity;
        replyTo = discussionData.replyTo;
    }
    let markup, request;
    let replyObject = undefined;
    if (replyTo != undefined) {
        replyObject = new Api.InputReplyToMessage({
            replyToMsgId: getMessageId(replyTo)!,
            topMsgId: getMessageId(topMsgId),
        });
    }

    if (message && message instanceof Api.Message) {
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
            return client.sendFile(entity, {
                file: message.media,
                caption: message.message,
                silent: silent,
                replyTo: replyTo,
                buttons: markup,
                formattingEntities: message.entities,
                scheduleDate: schedule,
            });
        }
        request = new Api.messages.SendMessage({
            peer: entity,
            message: message.message || "",
            silent: silent,
            replyTo: replyObject,
            replyMarkup: markup,
            entities: message.entities,
            clearDraft: clearDraft,
            noWebpage: !(message.media instanceof Api.MessageMediaWebPage),
            scheduleDate: schedule,
            noforwards: noforwards,
        });
        message = message.message;
    } else {
        if (formattingEntities == undefined) {
            [message, formattingEntities] = await _parseMessageText(
                client,
                message || "",
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
            replyTo: replyObject,
            clearDraft: clearDraft,
            silent: silent,
            replyMarkup: client.buildReplyMarkup(buttons),
            scheduleDate: schedule,
            noforwards: noforwards,
        });
    }
    const result = await client.invoke(request);
    if (result instanceof Api.UpdateShortSentMessage) {
        const msg = new Api.Message({
            id: result.id,
            peerId: await _getPeer(client, entity),
            message: message,
            date: result.date,
            out: result.out,
            media: result.media,
            entities: result.entities,
            replyMarkup: request.replyMarkup,
            ttlPeriod: result.ttlPeriod,
        });
        msg._finishInit(client, new Map(), entity);
        return msg;
    }
    return client._getResponseMessage(request, result, entity) as Api.Message;
}

/** @hidden */
export async function forwardMessages(
    client: TelegramClient,
    entity: EntityLike,
    {
        messages,
        fromPeer,
        silent,
        schedule,
        noforwards,
        dropAuthor,
    }: ForwardMessagesParams
) {
    if (!isArrayLike(messages)) {
        messages = [messages];
    }
    entity = await client.getInputEntity(entity);
    let fromPeerId: string | undefined;
    if (fromPeer) {
        fromPeer = await client.getInputEntity(fromPeer);
        fromPeerId = await client.getPeerId(fromPeer);
    }
    const getKey = (m: string | Api.Message) => {
        if (m instanceof Api.Message) {
            return m.chatId;
        }
        let msgId = parseID(m);

        if (msgId) {
            if (fromPeerId !== undefined) {
                return fromPeerId;
            }
            throw new Error("fromPeer must be given if integer IDs are used");
        } else {
            throw new Error(`Cannot forward ${m}`);
        }
    };
    const sent: Api.Message[] = [];
    for (let [chatId, chunk] of groupBy(messages, getKey) as Map<
        number,
        Api.Message[] | number[]
    >) {
        let chat;
        let numbers: number[] = [];
        if (typeof chunk[0] == "number") {
            chat = fromPeer;
            numbers = chunk as number[];
        } else {
            chat = await chunk[0].getInputChat();
            numbers = (chunk as Api.Message[]).map((m: Api.Message) => m.id);
        }
        chunk.push();
        const request = new Api.messages.ForwardMessages({
            fromPeer: chat,
            id: numbers,
            toPeer: entity,
            silent: silent,
            scheduleDate: schedule,
            noforwards: noforwards,
            dropAuthor: dropAuthor,
        });
        const result = await client.invoke(request);
        sent.push(
            client._getResponseMessage(request, result, entity) as Api.Message
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
        schedule,
    }: EditMessageParams
) {
    if (
        typeof message === "number" &&
        typeof text === "undefined" &&
        !file &&
        !schedule
    ) {
        throw Error(
            "You have to provide either file or text or schedule property."
        );
    }
    entity = await client.getInputEntity(entity);
    let id: number | undefined;
    let markup: Api.TypeReplyMarkup | undefined;
    let entities: Api.TypeMessageEntity[] | undefined;
    let inputMedia: Api.TypeInputMedia | undefined;
    if (file) {
        const { fileHandle, media, image } = await _fileToMedia(client, {
            file,
            forceDocument,
        });
        inputMedia = media;
    }
    if (message instanceof Api.Message) {
        id = getMessageId(message);
        text = message.message;
        entities = message.entities;
        if (buttons == undefined) {
            markup = message.replyMarkup;
        } else {
            markup = client.buildReplyMarkup(buttons);
        }
        if (message.media) {
            inputMedia = getInputMedia(message.media, { forceDocument });
        }
    } else {
        if (typeof message !== "number") {
            throw Error(
                "editMessageParams.message must be either a number or a Api.Message type"
            );
        }
        id = message;
        if (formattingEntities == undefined) {
            [text, entities] = await _parseMessageText(
                client,
                text || "",
                parseMode
            );
        } else {
            entities = formattingEntities;
        }
        markup = client.buildReplyMarkup(buttons);
    }
    const request = new Api.messages.EditMessage({
        peer: entity,
        id,
        message: text,
        noWebpage: !linkPreview,
        entities,
        media: inputMedia,
        replyMarkup: markup,
        scheduleDate: schedule,
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity) as Api.Message;
}

/** @hidden */
export async function deleteMessages(
    client: TelegramClient,
    entity: EntityLike | undefined,
    messageIds: MessageIDLike[],
    { revoke = false }
) {
    let ty = _EntityType.USER;
    if (entity) {
        entity = await client.getInputEntity(entity);
        ty = _entityType(entity);
    }
    const ids: number[] = [];
    for (const messageId of messageIds) {
        if (
            messageId instanceof Api.Message ||
            messageId instanceof Api.MessageService ||
            messageId instanceof Api.MessageEmpty
        ) {
            ids.push(messageId.id);
        } else if (typeof messageId === "number") {
            ids.push(messageId);
        } else {
            throw new Error(`Cannot convert ${messageId} to an integer`);
        }
    }
    const results = [];

    if (ty == _EntityType.CHANNEL) {
        for (const chunk of utils.chunks(ids)) {
            results.push(
                client.invoke(
                    new Api.channels.DeleteMessages({
                        channel: entity,
                        id: chunk,
                    })
                )
            );
        }
    } else {
        for (const chunk of utils.chunks(ids)) {
            results.push(
                client.invoke(
                    new Api.messages.DeleteMessages({
                        id: chunk,
                        revoke: revoke,
                    })
                )
            );
        }
    }
    return Promise.all(results);
}

/** @hidden */
export async function pinMessage(
    client: TelegramClient,
    entity: EntityLike,
    message?: MessageIDLike,
    pinMessageParams?: UpdatePinMessageParams
) {
    return await _pin(
        client,
        entity,
        message,
        false,
        pinMessageParams?.notify,
        pinMessageParams?.pmOneSide
    );
}

/** @hidden */
export async function unpinMessage(
    client: TelegramClient,
    entity: EntityLike,
    message?: MessageIDLike,
    unpinMessageParams?: UpdatePinMessageParams
) {
    return await _pin(
        client,
        entity,
        message,
        true,
        unpinMessageParams?.notify,
        unpinMessageParams?.pmOneSide
    );
}

/** @hidden */
export async function _pin(
    client: TelegramClient,
    entity: EntityLike,
    message: MessageIDLike | undefined,
    unpin: boolean,
    notify: boolean = false,
    pmOneSide: boolean = false
) {
    message = utils.getMessageId(message) || 0;

    if (message === 0) {
        return await client.invoke(
            new Api.messages.UnpinAllMessages({
                peer: entity,
            })
        );
    }

    entity = await client.getInputEntity(entity);

    const request = new Api.messages.UpdatePinnedMessage({
        silent: !notify,
        unpin,
        pmOneside: pmOneSide,
        peer: entity,
        id: message,
    });
    const result = await client.invoke(request);

    /**
     * Unpinning does not produce a service message.
     * Pinning a message that was already pinned also produces no service message.
     * Pinning a message in your own chat does not produce a service message,
     * but pinning on a private conversation with someone else does.
     */
    if (
        unpin ||
        !("updates" in result) ||
        ("updates" in result && !result.updates)
    ) {
        return;
    }

    // Pinning a message that doesn't exist would RPC-error earlier
    return client._getResponseMessage(request, result, entity) as Api.Message;
}

/** @hidden */
export async function markAsRead(
    client: TelegramClient,
    entity: EntityLike,
    message?: MessageIDLike | MessageIDLike[],
    markAsReadParams?: MarkAsReadParams
): Promise<boolean> {
    let maxId: number = markAsReadParams?.maxId || 0;
    const maxIdIsUndefined = markAsReadParams?.maxId === undefined;
    if (maxIdIsUndefined) {
        if (message) {
            if (Array.isArray(message)) {
                maxId = Math.max(
                    ...message.map((v) => utils.getMessageId(v) as number)
                );
            } else {
                maxId = utils.getMessageId(message) as number;
            }
        }
    }

    entity = await client.getInputEntity(entity);
    if (markAsReadParams && !markAsReadParams.clearMentions) {
        await client.invoke(new Api.messages.ReadMentions({ peer: entity }));
        if (maxIdIsUndefined && message === undefined) {
            return true;
        }
    }

    if (_entityType(entity) === _EntityType.CHANNEL) {
        return await client.invoke(
            new Api.channels.ReadHistory({ channel: entity, maxId })
        );
    } else {
        await client.invoke(
            new Api.messages.ReadHistory({ peer: entity, maxId })
        );
        return true;
    }
}

/** @hidden */
export async function getCommentData(
    client: TelegramClient,
    entity: EntityLike,
    message: number | Api.Message
) {
    const result = await client.invoke(
        new Api.messages.GetDiscussionMessage({
            peer: entity,
            msgId: utils.getMessageId(message),
        })
    );
    const relevantMessage = result.messages.reduce(
        (p: Api.TypeMessage, c: Api.TypeMessage) => (p && p.id < c.id ? p : c)
    );
    let chat;
    for (const c of result.chats) {
        if (
            relevantMessage.peerId instanceof Api.PeerChannel &&
            c.id.eq(relevantMessage.peerId.channelId)
        ) {
            chat = c;
            break;
        }
    }
    return {
        entity: utils.getInputPeer(chat),
        replyTo: relevantMessage.id,
    };
}

// TODO do the rest
