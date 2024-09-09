/// <reference types="node" />
import { SenderGetter } from "./senderGetter";
import type { Entity, EntityLike } from "../../define";
import { Api } from "../api";
import type { TelegramClient } from "../..";
import { Forward } from "./forward";
import { File } from "./file";
import { EditMessageParams, SendMessageParams, UpdatePinMessageParams } from "../../client/messages";
import { DownloadMediaInterface } from "../../client/downloads";
import bigInt, { BigInteger } from "big-integer";
import { MessageButton } from "./messageButton";
import { inspect } from "../../inspect";
interface MessageBaseInterface {
    id: any;
    peerId?: any;
    date?: any;
    out?: any;
    mentioned?: any;
    mediaUnread?: any;
    silent?: any;
    post?: any;
    fromId?: any;
    replyTo?: any;
    message?: any;
    fwdFrom?: any;
    viaBotId?: any;
    media?: any;
    replyMarkup?: any;
    entities?: any;
    views?: any;
    editDate?: any;
    postAuthor?: any;
    groupedId?: any;
    fromScheduled?: any;
    legacy?: any;
    editHide?: any;
    pinned?: any;
    restrictionReason?: any;
    forwards?: any;
    ttlPeriod?: number;
    replies?: any;
    action?: any;
    reactions?: any;
    noforwards?: any;
    _entities?: Map<string, Entity>;
}
/**
 * Interface for clicking a message button.
 * Calls `SendVote` with the specified poll option
 * or `button.click <MessageButton.click>`
 * on the specified button.
 * Does nothing if the message is not a poll or has no buttons.
 * @example
 * ```ts
 *    # Click the first button
 *    await message.click(0)
 *
 *    # Click some row/column
 *    await message.click(row, column)
 *
 *    # Click by text
 *    await message.click({text:'👍'})
 *
 *    # Click by data
 *    await message.click({data:'payload'})
 *
 *    # Click on a button requesting a phone
 *    await message.click(0, {share_phone:true})
 * ```
 */
export interface ButtonClickParam {
    /** Clicks the i'th button or poll option (starting from the index 0).
     For multiple-choice polls, a list with the indices should be used.
     Will ``raise IndexError`` if out of bounds. Example:

     >>> message = ...  # get the message somehow
     >>> # Clicking the 3rd button
     >>> # [button1] [button2]
     >>> # [     button3     ]
     >>> # [button4] [button5]
     >>> await message.click(2)  # index
     . */
    i?: number | number[];
    /**
     * Clicks the button at position (i, j), these being the
     * indices for the (row, column) respectively. Example:

     >>> # Clicking the 2nd button on the 1st row.
     >>> # [button1] [button2]
     >>> # [     button3     ]
     >>> # [button4] [button5]
     >>> await message.click(0, 1)  # (row, column)

     This is equivalent to ``message.buttons[0][1].click()``.
     */
    j?: number;
    /**                 Clicks the first button or poll option with the text "text". This may
     also be a callable, like a ``new RegExp('foo*').test``,
     and the text will be passed to it.

     If you need to select multiple options in a poll,
     pass a list of indices to the ``i`` parameter.
     */
    text?: string | Function;
    /** Clicks the first button or poll option for which the callable
     returns `True`. The callable should accept a single
     `MessageButton <messagebutton.MessageButton>`
     or `PollAnswer <PollAnswer>` argument.
     If you need to select multiple options in a poll,
     pass a list of indices to the ``i`` parameter.
     */
    filter?: Function;
    /** This argument overrides the rest and will not search any
     buttons. Instead, it will directly send the request to
     behave as if it clicked a button with said data. Note
     that if the message does not have this data, it will
     ``DATA_INVALID``.
     */
    data?: Buffer;
    /** When clicking on a keyboard button requesting a phone number
     (`KeyboardButtonRequestPhone`), this argument must be
     explicitly set to avoid accidentally sharing the number.

     It can be `true` to automatically share the current user's
     phone, a string to share a specific phone number, or a contact
     media to specify all details.

     If the button is pressed without this, `new Error("Value Error")` is raised.
     */
    sharePhone?: boolean | string | Api.InputMediaContact;
    /** When clicking on a keyboard button requesting a geo location
     (`KeyboardButtonRequestGeoLocation`), this argument must
     be explicitly set to avoid accidentally sharing the location.

     It must be a `list` of `float` as ``(longitude, latitude)``,
     or a :tl:`InputGeoPoint` instance to avoid accidentally using
     the wrong roder.

     If the button is pressed without this, `ValueError` is raised.
     */
    shareGeo?: [number, number] | Api.InputMediaGeoPoint;
    /**When clicking certain buttons (such as BotFather's confirmation
     button to transfer ownership), if your account has 2FA enabled,
     you need to provide your account's password. Otherwise,
     `PASSWORD_HASH_INVALID` is raised.
     */
    password?: string;
}
/**
 * This custom class aggregates both {@link Api.Message} and {@link Api.MessageService} to ease accessing their members.<br/>
 * <br/>
 * Remember that this class implements {@link ChatGetter} and {@link SenderGetter}<br/>
 * which means you have access to all their sender and chat properties and methods.
 */
export declare class CustomMessage extends SenderGetter {
    static CONSTRUCTOR_ID: number;
    static SUBCLASS_OF_ID: number;
    CONSTRUCTOR_ID: number;
    SUBCLASS_OF_ID: number;
    /**
     * Whether the message is outgoing (i.e. you sent it from
     * another session) or incoming (i.e. someone else sent it).
     * <br/>
     * Note that messages in your own chat are always incoming,
     * but this member will be `true` if you send a message
     * to your own chat. Messages you forward to your chat are
     * **not** considered outgoing, just like official clients
     * display them.
     */
    out?: boolean;
    /**
     * Whether you were mentioned in this message or not.
     * Note that replies to your own messages also count as mentions.
     */
    mentioned?: boolean;
    /** Whether you have read the media in this message
     * or not, e.g. listened to the voice note media.
     */
    mediaUnread?: boolean;
    /**
     * Whether the message should notify people with sound or not.
     * Previously used in channels, but since 9 August 2019, it can
     * also be {@link https://telegram.org/blog/silent-messages-slow-mode|used in private chats}
     */
    silent?: boolean;
    /**
     * Whether this message is a post in a broadcast
     * channel or not.
     */
    post?: boolean;
    /**
     * Whether this message was originated from a previously-scheduled
     * message or not.
     */
    fromScheduled?: boolean;
    /**
     * Whether this is a legacy message or not.
     */
    legacy?: boolean;
    /**
     * Whether the edited mark of this message is edited
     * should be hidden (e.g. in GUI clients) or shown.
     */
    editHide?: boolean;
    /**
     *  Whether this message is currently pinned or not.
     */
    pinned?: boolean;
    /**
     * The ID of this message. This field is *always* present.
     * Any other member is optional and may be `undefined`.
     */
    id: number;
    /**
     * The peer who sent this message, which is either
     * {@link Api.PeerUser}, {@link Api.PeerChat} or {@link Api.PeerChannel}.
     * This value will be `undefined` for anonymous messages.
     */
    fromId?: Api.TypePeer;
    /**
     * The peer to which this message was sent, which is either
     * {@link Api.PeerUser}, {@link Api.PeerChat} or {@link Api.PeerChannel}.
     * This will always be present except for empty messages.
     */
    peerId: Api.TypePeer;
    /**
     * The original forward header if this message is a forward.
     * You should probably use the `forward` property instead.
     */
    fwdFrom?: Api.TypeMessageFwdHeader;
    /**
     * The ID of the bot used to send this message
     * through its inline mode (e.g. "via @like").
     */
    viaBotId?: bigInt.BigInteger;
    /**
     * The original reply header if this message is replying to another.
     */
    replyTo?: Api.MessageReplyHeader;
    /**
     * The timestamp indicating when this message was sent.
     * This will always be present except for empty messages.
     */
    date: number;
    /**
     * The string text of the message for {@link Api.Message} instances,
     * which will be `undefined` for other types of messages.
     */
    message: string;
    /**
     * The media sent with this message if any (such as photos, videos, documents, gifs, stickers, etc.).
     *
     * You may want to access the `photo`, `document` etc. properties instead.
     *
     * If the media was not present or it was {@link Api.MessageMediaEmpty},
     * this member will instead be `undefined` for convenience.
     */
    media?: Api.TypeMessageMedia;
    /**
     * The reply markup for this message (which was sent either via a bot or by a bot).
     * You probably want to access `buttons` instead.
     */
    replyMarkup?: Api.TypeReplyMarkup;
    /**
     * The list of markup entities in this message,
     * such as bold, italics, code, hyperlinks, etc.
     */
    entities?: Api.TypeMessageEntity[];
    /**
     *  The number of views this message from a broadcast channel has.
     *  This is also present in forwards.
     */
    views?: number;
    /**
     * The number of times this message has been forwarded.
     */
    forwards?: number;
    /**
     *  The number of times another message has replied to this message.
     */
    replies?: Api.TypeMessageReplies;
    /**
     * The date when this message was last edited.
     */
    editDate?: number;
    /**
     * The display name of the message sender to show in messages sent to broadcast channels.
     */
    postAuthor?: string;
    /**
     *  If this message belongs to a group of messages (photo albums or video albums),
     *  all of them will have the same value here.
     */
    groupedId?: BigInteger;
    /**
     * An optional list of reasons why this message was restricted.
     * If the list is `undefined`, this message has not been restricted.
     */
    restrictionReason?: Api.TypeRestrictionReason[];
    /**
     * The message action object of the message for {@link Api.MessageService}
     * instances, which will be `undefined` for other types of messages.
     */
    action: Api.TypeMessageAction;
    /**
     * The Time To Live period configured for this message.
     * The message should be erased from wherever it's stored (memory, a
     * local database, etc.) when this threshold is met.
     */
    ttlPeriod?: number;
    reactions?: Api.MessageReactions;
    noforwards?: boolean;
    /** @hidden */
    _actionEntities?: any;
    /** @hidden */
    _client?: TelegramClient;
    /** @hidden */
    _text?: string;
    /** @hidden */
    _file?: File;
    /** @hidden */
    _replyMessage?: Api.Message;
    /** @hidden */
    _buttons?: MessageButton[][];
    /** @hidden */
    _buttonsFlat?: MessageButton[];
    /** @hidden */
    _buttonsCount?: number;
    /** @hidden */
    _viaBot?: EntityLike;
    /** @hidden */
    _viaInputBot?: EntityLike;
    /** @hidden */
    _inputSender?: any;
    /** @hidden */
    _forward?: Forward;
    /** @hidden */
    _sender?: any;
    /** @hidden */
    _entities?: Map<string, Entity>;
    /** @hidden */
    getBytes(): Buffer;
    originalArgs: any;
    patternMatch?: RegExpMatchArray;
    [inspect.custom](): {
        [key: string]: any;
    };
    init({ id, peerId, date, out, mentioned, mediaUnread, silent, post, fromId, replyTo, message, fwdFrom, viaBotId, media, replyMarkup, entities, views, editDate, postAuthor, groupedId, fromScheduled, legacy, editHide, pinned, restrictionReason, forwards, replies, action, reactions, noforwards, ttlPeriod, _entities, }: MessageBaseInterface): void;
    constructor(args: MessageBaseInterface);
    _finishInit(client: TelegramClient, entities: Map<string, Entity>, inputChat?: EntityLike): void;
    get client(): TelegramClient | undefined;
    get text(): string;
    set text(value: string);
    get rawText(): string;
    /**
     * @param {string} value
     */
    set rawText(value: string);
    get isReply(): boolean;
    get forward(): Forward | undefined;
    _refetchSender(): Promise<void>;
    /**
     * Re-fetches this message to reload the sender and chat entities,
     * along with their input versions.
     * @private
     */
    _reloadMessage(): Promise<void>;
    /**
     * Returns a list of lists of `MessageButton <MessageButton>`, if any.
     * Otherwise, it returns `undefined`.
     */
    get buttons(): MessageButton[][] | undefined;
    /**
     * Returns `buttons` when that property fails (this is rarely needed).
     */
    getButtons(): Promise<MessageButton[][] | undefined>;
    get buttonCount(): number;
    get file(): File | undefined;
    get photo(): Api.TypePhoto | undefined;
    get document(): Api.Document | undefined;
    get webPreview(): Api.WebPage | undefined;
    get audio(): Api.Document | undefined;
    get voice(): Api.Document | undefined;
    get video(): Api.Document | undefined;
    get videoNote(): Api.Document | undefined;
    get gif(): Api.Document | undefined;
    get sticker(): Api.Document | undefined;
    get contact(): Api.MessageMediaContact | undefined;
    get game(): Api.Game | undefined;
    get geo(): Api.TypeGeoPoint | undefined;
    get invoice(): Api.MessageMediaInvoice | undefined;
    get poll(): Api.MessageMediaPoll | undefined;
    get venue(): Api.MessageMediaVenue | undefined;
    get dice(): Api.MessageMediaDice | undefined;
    get actionEntities(): any;
    get viaBot(): EntityLike | undefined;
    get viaInputBot(): EntityLike | undefined;
    get replyToMsgId(): number | undefined;
    get toId(): Api.TypePeer;
    getEntitiesText(cls?: Function): any;
    getReplyMessage(): Promise<Api.Message | undefined>;
    respond(params: SendMessageParams): Promise<Api.Message | undefined>;
    reply(params: SendMessageParams): Promise<Api.Message | undefined>;
    forwardTo(entity: EntityLike): Promise<Api.Message[] | undefined>;
    edit(params: Omit<EditMessageParams, "message">): Promise<Api.Message | undefined>;
    delete({ revoke }?: {
        revoke: boolean;
    }): Promise<Api.messages.AffectedMessages[] | undefined>;
    pin(params?: UpdatePinMessageParams): Promise<Api.Message | undefined>;
    unpin(params?: UpdatePinMessageParams): Promise<undefined>;
    downloadMedia(params?: DownloadMediaInterface): Promise<string | Buffer | undefined>;
    markAsRead(): Promise<boolean | undefined>;
    click({ i, j, text, filter, data, sharePhone, shareGeo, password, }: ButtonClickParam): Promise<string | Api.Message | Api.messages.BotCallbackAnswer | Api.TypeUpdates | null | undefined>;
    /**
     * Helper methods to set the buttons given the input sender and chat.
     */
    _setButtons(chat: EntityLike, bot?: EntityLike): void;
    /**
     *Returns the input peer of the bot that's needed for the reply markup.

     This is necessary for `KeyboardButtonSwitchInline` since we need
     to know what bot we want to start. Raises ``Error`` if the bot
     cannot be found but is needed. Returns `None` if it's not needed.
     */
    _neededMarkupBot(): any;
    _documentByAttribute(kind: Function, condition?: Function): Api.Document | undefined;
}
export {};
