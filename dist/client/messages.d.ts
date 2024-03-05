import { Api } from "../tl";
import type { DateLike, EntityLike, FileLike, MarkupLike, MessageIDLike, MessageLike } from "../define";
import { RequestIter } from "../requestIter";
import { TotalList } from "../Helpers";
import type { TelegramClient } from "../";
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
export declare class _MessagesIter extends RequestIter {
    entity?: Api.TypeInputPeer;
    request?: Api.messages.SearchGlobal | Api.messages.GetReplies | Api.messages.GetHistory | Api.messages.Search;
    addOffset?: number;
    maxId?: number;
    minId?: number;
    lastId?: number;
    _init({ entity, offsetId, minId, maxId, fromUser, offsetDate, addOffset, filter, search, replyTo, }: MessageIterParams): Promise<false | undefined>;
    _loadNextChunk(): Promise<true | undefined>;
    _messageInRange(message: Api.Message): boolean;
    [Symbol.asyncIterator](): AsyncIterator<Api.Message, any, undefined>;
    _updateOffset(lastMessage: Api.Message, response: any): void;
}
interface IDsIterInterface {
    entity: EntityLike;
    ids: Api.TypeInputMessage[];
}
export declare class _IDsIter extends RequestIter {
    _ids?: Api.TypeInputMessage[];
    _offset?: number;
    _ty: number | undefined;
    private _entity;
    _init({ entity, ids }: IDsIterInterface): Promise<void>;
    [Symbol.asyncIterator](): AsyncIterator<Api.Message, any, undefined>;
    _loadNextChunk(): Promise<false | undefined>;
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
export declare function iterMessages(client: TelegramClient, entity: EntityLike | undefined, options: Partial<IterMessagesParams>): _MessagesIter | _IDsIter;
/** @hidden */
export declare function getMessages(client: TelegramClient, entity: EntityLike | undefined, params: Partial<IterMessagesParams>): Promise<TotalList<Api.Message>>;
/** @hidden */
export declare function sendMessage(client: TelegramClient, 
/** To who will it be sent. */
entity: EntityLike, 
/**  The message to be sent, or another message object to resend as a copy.<br/>
 * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
 * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
{ message, replyTo, attributes, parseMode, formattingEntities, linkPreview, file, thumb, forceDocument, clearDraft, buttons, silent, supportStreaming, schedule, noforwards, commentTo, topMsgId, }?: SendMessageParams): Promise<Api.Message>;
/** @hidden */
export declare function forwardMessages(client: TelegramClient, entity: EntityLike, { messages, fromPeer, silent, schedule, noforwards, dropAuthor, }: ForwardMessagesParams): Promise<Api.Message[]>;
/** @hidden */
export declare function editMessage(client: TelegramClient, entity: EntityLike, { message, text, parseMode, formattingEntities, linkPreview, file, forceDocument, buttons, schedule, }: EditMessageParams): Promise<Api.Message>;
/** @hidden */
export declare function deleteMessages(client: TelegramClient, entity: EntityLike | undefined, messageIds: MessageIDLike[], { revoke }: {
    revoke?: boolean | undefined;
}): Promise<Api.messages.AffectedMessages[]>;
/** @hidden */
export declare function pinMessage(client: TelegramClient, entity: EntityLike, message?: MessageIDLike, pinMessageParams?: UpdatePinMessageParams): Promise<Api.Message | Api.messages.AffectedHistory | undefined>;
/** @hidden */
export declare function unpinMessage(client: TelegramClient, entity: EntityLike, message?: MessageIDLike, unpinMessageParams?: UpdatePinMessageParams): Promise<Api.Message | Api.messages.AffectedHistory | undefined>;
/** @hidden */
export declare function _pin(client: TelegramClient, entity: EntityLike, message: MessageIDLike | undefined, unpin: boolean, notify?: boolean, pmOneSide?: boolean): Promise<Api.Message | Api.messages.AffectedHistory | undefined>;
/** @hidden */
export declare function markAsRead(client: TelegramClient, entity: EntityLike, message?: MessageIDLike | MessageIDLike[], markAsReadParams?: MarkAsReadParams): Promise<boolean>;
/** @hidden */
export declare function getCommentData(client: TelegramClient, entity: EntityLike, message: number | Api.Message): Promise<{
    entity: Api.TypeInputPeer;
    replyTo: number;
}>;
export {};
