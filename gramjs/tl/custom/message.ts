import { SenderGetter } from "./senderGetter";
import type { Entity, EntityLike } from "../../define";
import { Api } from "../api";
import type { TelegramClient } from "../..";
import { ChatGetter } from "./chatGetter";
import * as utils from "../../Utils";
import { Forward } from "./forward";
import { File } from "./file";
import {
    EditMessageParams,
    SendMessageParams,
    UpdatePinMessageParams,
} from "../../client/messages";
import { DownloadMediaInterface } from "../../client/downloads";
import { betterConsoleLog, returnBigInt } from "../../Helpers";
import { _selfId } from "../../client/users";
import bigInt, { BigInteger } from "big-integer";
import { LogLevel } from "../../extensions/Logger";
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
export class CustomMessage extends SenderGetter {
    static CONSTRUCTOR_ID: number;
    static SUBCLASS_OF_ID: number;
    CONSTRUCTOR_ID!: number;
    SUBCLASS_OF_ID!: number;

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
    id!: number;
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
    peerId!: Api.TypePeer;
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
    date!: number;
    /**
     * The string text of the message for {@link Api.Message} instances,
     * which will be `undefined` for other types of messages.
     */
    message!: string;
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
    action!: Api.TypeMessageAction;
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

    /* @ts-ignore */
    getBytes(): Buffer;

    originalArgs: any;

    patternMatch?: RegExpMatchArray;

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    init({
        id,
        peerId = undefined,
        date = undefined,
        out = undefined,
        mentioned = undefined,
        mediaUnread = undefined,
        silent = undefined,
        post = undefined,
        fromId = undefined,
        replyTo = undefined,
        message = undefined,
        fwdFrom = undefined,
        viaBotId = undefined,
        media = undefined,
        replyMarkup = undefined,
        entities = undefined,
        views = undefined,
        editDate = undefined,
        postAuthor = undefined,
        groupedId = undefined,
        fromScheduled = undefined,
        legacy = undefined,
        editHide = undefined,
        pinned = undefined,
        restrictionReason = undefined,
        forwards = undefined,
        replies = undefined,
        action = undefined,
        reactions = undefined,
        noforwards = undefined,
        ttlPeriod = undefined,
        _entities = new Map<string, Entity>(),
    }: MessageBaseInterface) {
        if (!id) throw new Error("id is a required attribute for Message");
        let senderId = undefined;
        if (fromId) {
            senderId = utils.getPeerId(fromId);
        } else if (peerId) {
            if (post || (!out && peerId instanceof Api.PeerUser)) {
                senderId = utils.getPeerId(peerId);
            }
        }
        // Common properties to all messages
        this._entities = _entities;
        this.out = out;
        this.mentioned = mentioned;
        this.mediaUnread = mediaUnread;
        this.silent = silent;
        this.post = post;
        this.post = post;
        this.fromScheduled = fromScheduled;
        this.legacy = legacy;
        this.editHide = editHide;
        this.ttlPeriod = ttlPeriod;
        this.id = id;
        this.fromId = fromId;
        this.peerId = peerId;
        this.fwdFrom = fwdFrom;
        this.viaBotId = viaBotId;
        this.replyTo = replyTo;
        this.date = date;
        this.message = message;
        this.media = media instanceof Api.MessageMediaEmpty ? media : undefined;
        this.replyMarkup = replyMarkup;
        this.entities = entities;
        this.views = views;
        this.forwards = forwards;
        this.replies = replies;
        this.editDate = editDate;
        this.pinned = pinned;
        this.postAuthor = postAuthor;
        this.groupedId = groupedId;
        this.restrictionReason = restrictionReason;
        this.action = action;
        this.noforwards = noforwards;
        this.reactions = reactions;

        this._client = undefined;
        this._text = undefined;
        this._file = undefined;
        this._replyMessage = undefined;
        this._buttons = undefined;
        this._buttonsFlat = undefined;
        this._buttonsCount = 0;
        this._viaBot = undefined;
        this._viaInputBot = undefined;
        this._actionEntities = undefined;

        // Note: these calls would reset the client
        ChatGetter.initChatClass(this, { chatPeer: peerId, broadcast: post });
        SenderGetter.initSenderClass(this, {
            senderId: senderId ? returnBigInt(senderId) : undefined,
        });

        this._forward = undefined;
    }

    constructor(args: MessageBaseInterface) {
        super();
        this.init(args);
    }

    _finishInit(
        client: TelegramClient,
        entities: Map<string, Entity>,
        inputChat?: EntityLike
    ) {
        this._client = client;
        const cache = client._entityCache;
        if (this.senderId) {
            [this._sender, this._inputSender] = utils._getEntityPair(
                this.senderId.toString(),
                entities,
                cache
            );
        }
        if (this.chatId) {
            [this._chat, this._inputChat] = utils._getEntityPair(
                this.chatId.toString(),
                entities,
                cache
            );
        }

        if (inputChat) {
            // This has priority
            this._inputChat = inputChat;
        }

        if (this.viaBotId) {
            [this._viaBot, this._viaInputBot] = utils._getEntityPair(
                this.viaBotId.toString(),
                entities,
                cache
            );
        }

        if (this.fwdFrom) {
            this._forward = new Forward(this._client, this.fwdFrom, entities);
        }

        if (this.action) {
            if (
                this.action instanceof Api.MessageActionChatAddUser ||
                this.action instanceof Api.MessageActionChatCreate
            ) {
                this._actionEntities = this.action.users.map((i) =>
                    entities.get(i.toString())
                );
            } else if (this.action instanceof Api.MessageActionChatDeleteUser) {
                this._actionEntities = [
                    entities.get(this.action.userId.toString()),
                ];
            } else if (
                this.action instanceof Api.MessageActionChatJoinedByLink
            ) {
                this._actionEntities = [
                    entities.get(
                        utils.getPeerId(
                            new Api.PeerChannel({
                                channelId: this.action.inviterId,
                            })
                        )
                    ),
                ];
            } else if (
                this.action instanceof Api.MessageActionChannelMigrateFrom
            ) {
                this._actionEntities = [
                    entities.get(
                        utils.getPeerId(
                            new Api.PeerChat({ chatId: this.action.chatId })
                        )
                    ),
                ];
            }
        }
    }

    get client() {
        return this._client;
    }

    get text() {
        if (this._text === undefined && this._client) {
            if (!this._client.parseMode) {
                this._text = this.message;
            } else {
                this._text = this._client.parseMode.unparse(
                    this.message || "",
                    this.entities || []
                );
            }
        }
        return this._text || "";
    }

    set text(value: string) {
        this._text = value;
        if (this._client && this._client.parseMode) {
            [this.message, this.entities] = this._client.parseMode.parse(value);
        } else {
            this.message = value;
            this.entities = [];
        }
    }

    get rawText() {
        return this.message || "";
    }

    /**
     * @param {string} value
     */
    set rawText(value: string) {
        this.message = value;
        this.entities = [];
        this._text = "";
    }

    get isReply(): boolean {
        return !!this.replyTo;
    }

    get forward() {
        return this._forward;
    }

    async _refetchSender() {
        await this._reloadMessage();
    }

    /**
     * Re-fetches this message to reload the sender and chat entities,
     * along with their input versions.
     * @private
     */
    async _reloadMessage() {
        if (!this._client) return;
        let msg: CustomMessage | undefined = undefined;
        try {
            const chat = this.isChannel ? await this.getInputChat() : undefined;
            let temp = await this._client.getMessages(chat, { ids: this.id });
            if (temp) {
                msg = temp[0] as CustomMessage;
            }
        } catch (e) {
            this._client._log.error(
                "Got error while trying to finish init message with id " +
                    this.id
            );
            if (this._client._errorHandler) {
                await this._client._errorHandler(e as Error);
            }
            if (this._client._log.canSend(LogLevel.ERROR)) {
                console.error(e);
            }
        }
        if (msg == undefined) return;

        this._sender = msg._sender;
        this._inputSender = msg._inputSender;
        this._chat = msg._chat;
        this._inputChat = msg._inputChat;
        this._viaBot = msg._viaBot;
        this._viaInputBot = msg._viaInputBot;
        this._forward = msg._forward;
        this._actionEntities = msg._actionEntities;
    }

    /**
     * Returns a list of lists of `MessageButton <MessageButton>`, if any.
     * Otherwise, it returns `undefined`.
     */
    get buttons() {
        if (!this._buttons && this.replyMarkup) {
            if (!this.inputChat) {
                return;
            }
            try {
                const bot = this._neededMarkupBot();
                this._setButtons(this.inputChat, bot);
            } catch (e) {
                return;
            }
        }
        return this._buttons;
    }

    /**
     * Returns `buttons` when that property fails (this is rarely needed).
     */
    async getButtons() {
        if (!this.buttons && this.replyMarkup) {
            const chat = await this.getInputChat();
            if (!chat) return;
            let bot;
            try {
                bot = this._neededMarkupBot();
            } catch (e) {
                await this._reloadMessage();
                bot = this._neededMarkupBot();
            }
            this._setButtons(chat, bot);
        }
        return this._buttons;
    }

    get buttonCount() {
        if (!this._buttonsCount) {
            if (
                this.replyMarkup instanceof Api.ReplyInlineMarkup ||
                this.replyMarkup instanceof Api.ReplyKeyboardMarkup
            ) {
                this._buttonsCount = this.replyMarkup.rows
                    .map((r) => r.buttons.length)
                    .reduce(function (a, b) {
                        return a + b;
                    }, 0);
            } else {
                this._buttonsCount = 0;
            }
        }
        return this._buttonsCount;
    }

    get file() {
        if (!this._file) {
            const media = this.photo || this.document;
            if (media) {
                this._file = new File(media);
            }
        }
        return this._file;
    }

    get photo() {
        if (this.media instanceof Api.MessageMediaPhoto) {
            if (this.media.photo instanceof Api.Photo) return this.media.photo;
        } else if (this.action instanceof Api.MessageActionChatEditPhoto) {
            return this.action.photo;
        } else {
            return this.webPreview && this.webPreview.photo instanceof Api.Photo
                ? this.webPreview.photo
                : undefined;
        }
        return undefined;
    }

    get document() {
        if (this.media instanceof Api.MessageMediaDocument) {
            if (this.media.document instanceof Api.Document)
                return this.media.document;
        } else {
            const web = this.webPreview;

            return web && web.document instanceof Api.Document
                ? web.document
                : undefined;
        }
        return undefined;
    }

    get webPreview() {
        if (this.media instanceof Api.MessageMediaWebPage) {
            if (this.media.webpage instanceof Api.WebPage)
                return this.media.webpage;
        }
    }

    get audio() {
        return this._documentByAttribute(
            Api.DocumentAttributeAudio,
            (attr: Api.DocumentAttributeAudio) => !attr.voice
        );
    }

    get voice() {
        return this._documentByAttribute(
            Api.DocumentAttributeAudio,
            (attr: Api.DocumentAttributeAudio) => !!attr.voice
        );
    }

    get video() {
        return this._documentByAttribute(Api.DocumentAttributeVideo);
    }

    get videoNote() {
        return this._documentByAttribute(
            Api.DocumentAttributeVideo,
            (attr: Api.DocumentAttributeVideo) => !!attr.roundMessage
        );
    }

    get gif() {
        return this._documentByAttribute(Api.DocumentAttributeAnimated);
    }

    get sticker() {
        return this._documentByAttribute(Api.DocumentAttributeSticker);
    }

    get contact() {
        if (this.media instanceof Api.MessageMediaContact) {
            return this.media;
        }
    }

    get game() {
        if (this.media instanceof Api.MessageMediaGame) {
            return this.media.game;
        }
    }

    get geo() {
        if (
            this.media instanceof Api.MessageMediaGeo ||
            this.media instanceof Api.MessageMediaGeoLive ||
            this.media instanceof Api.MessageMediaVenue
        ) {
            return this.media.geo;
        }
    }

    get invoice() {
        if (this.media instanceof Api.MessageMediaInvoice) {
            return this.media;
        }
    }

    get poll() {
        if (this.media instanceof Api.MessageMediaPoll) {
            return this.media;
        }
    }

    get venue() {
        if (this.media instanceof Api.MessageMediaVenue) {
            return this.media;
        }
    }

    get dice() {
        if (this.media instanceof Api.MessageMediaDice) {
            return this.media;
        }
    }

    get actionEntities() {
        return this._actionEntities;
    }

    get viaBot() {
        return this._viaBot;
    }

    get viaInputBot() {
        return this._viaInputBot;
    }

    get replyToMsgId() {
        return this.replyTo?.replyToMsgId;
    }

    get toId() {
        if (this._client && !this.out && this.isPrivate) {
            return new Api.PeerUser({
                userId: _selfId(this._client)!,
            });
        }
        return this.peerId;
    }

    getEntitiesText(cls?: Function) {
        let ent = this.entities;
        if (!ent || ent.length == 0) return;

        if (cls) {
            ent = ent.filter((v: any) => v instanceof cls);
        }

        const texts = utils.getInnerText(this.message || "", ent);
        const zip = (rows: any[]) =>
            rows[0].map((_: any, c: string | number) =>
                rows.map((row) => row[c])
            );

        return zip([ent, texts]);
    }

    async getReplyMessage(): Promise<Api.Message | undefined> {
        if (!this._replyMessage && this._client) {
            if (!this.replyTo) return undefined;

            // Bots cannot access other bots' messages by their ID.
            // However they can access them through replies...
            this._replyMessage = (
                await this._client.getMessages(
                    this.isChannel ? await this.getInputChat() : undefined,
                    {
                        ids: new Api.InputMessageReplyTo({ id: this.id }),
                    }
                )
            )[0];

            if (!this._replyMessage) {
                // ...unless the current message got deleted.
                //
                // If that's the case, give it a second chance accessing
                // directly by its ID.
                this._replyMessage = (
                    await this._client.getMessages(
                        this.isChannel ? this._inputChat : undefined,
                        {
                            ids: this.replyToMsgId,
                        }
                    )
                )[0];
            }
        }
        return this._replyMessage;
    }

    async respond(params: SendMessageParams) {
        if (this._client) {
            return this._client.sendMessage(
                (await this.getInputChat())!,
                params
            );
        }
    }

    async reply(params: SendMessageParams) {
        if (this._client) {
            params.replyTo = this.id;
            return this._client.sendMessage(
                (await this.getInputChat())!,
                params
            );
        }
    }

    async forwardTo(entity: EntityLike) {
        if (this._client) {
            entity = await this._client.getInputEntity(entity);
            const params = {
                messages: [this.id],
                fromPeer: (await this.getInputChat())!,
            };
            return this._client.forwardMessages(entity, params);
        }
    }

    async edit(params: Omit<EditMessageParams, "message">) {
        const param = params as EditMessageParams;
        if (this.fwdFrom || !this._client) return undefined;
        if (param.linkPreview == undefined) {
            param.linkPreview = !!this.webPreview;
        }
        if (param.buttons == undefined) {
            param.buttons = this.replyMarkup;
        }
        param.message = this.id;
        return this._client.editMessage((await this.getInputChat())!, param);
    }

    async delete({ revoke } = { revoke: false }) {
        if (this._client) {
            return this._client.deleteMessages(
                await this.getInputChat(),
                [this.id],
                {
                    revoke,
                }
            );
        }
    }

    async pin(params?: UpdatePinMessageParams) {
        if (this._client) {
            const entity = await this.getInputChat();
            if (entity === undefined) {
                throw Error(
                    "Failed to pin message due to cannot get input chat."
                );
            }
            return this._client.pinMessage(entity, this.id, params);
        }
    }

    async unpin(params?: UpdatePinMessageParams) {
        if (this._client) {
            const entity = await this.getInputChat();
            if (entity === undefined) {
                throw Error(
                    "Failed to unpin message due to cannot get input chat."
                );
            }
            return this._client.unpinMessage(entity, this.id, params);
        }
    }

    async downloadMedia(params?: DownloadMediaInterface) {
        // small hack for patched method
        if (this._client)
            return this._client.downloadMedia(this as any, params || {});
    }

    async markAsRead() {
        if (this._client) {
            const entity = await this.getInputChat();
            if (entity === undefined) {
                throw Error(
                    `Failed to mark message id ${this.id} as read due to cannot get input chat.`
                );
            }
            return this._client.markAsRead(entity, this.id);
        }
    }

    async click({
        i,
        j,
        text,
        filter,
        data,
        sharePhone,
        shareGeo,
        password,
    }: ButtonClickParam) {
        if (!this.client) {
            return;
        }
        if (data) {
            const chat = await this.getInputChat();
            if (!chat) {
                return;
            }

            const button = new Api.KeyboardButtonCallback({
                text: "",
                data: data,
            });
            return await new MessageButton(
                this.client,
                button,
                chat,
                undefined,
                this.id
            ).click({
                sharePhone: sharePhone,
                shareGeo: shareGeo,
                password: password,
            });
        }
        if (this.poll) {
            function findPoll(answers: Api.PollAnswer[]) {
                if (i != undefined) {
                    if (Array.isArray(i)) {
                        const corrects = [];
                        for (let x = 0; x < i.length; x++) {
                            corrects.push(answers[x].option);
                        }
                        return corrects;
                    }
                    return [answers[i].option];
                }
                if (text != undefined) {
                    if (typeof text == "function") {
                        for (const answer of answers) {
                            if (text(answer.text)) {
                                return [answer.option];
                            }
                        }
                    } else {
                        for (const answer of answers) {
                            if (answer.text.text == text) {
                                return [answer.option];
                            }
                        }
                    }
                    return;
                }
                if (filter != undefined) {
                    for (const answer of answers) {
                        if (filter(answer)) {
                            return [answer.option];
                        }
                    }
                    return;
                }
            }

            const options = findPoll(this.poll.poll.answers) || [];
            return await this.client.invoke(
                new Api.messages.SendVote({
                    peer: this.inputChat,
                    msgId: this.id,
                    options: options,
                })
            );
        }

        if (!(await this.getButtons())) {
            return; // Accessing the property sets this._buttons[_flat]
        }

        function findButton(self: CustomMessage) {
            if (!self._buttonsFlat || !self._buttons) {
                return;
            }
            if (Array.isArray(i)) {
                i = i[0];
            }
            if (text != undefined) {
                if (typeof text == "function") {
                    for (const button of self._buttonsFlat) {
                        if (text(button.text)) {
                            return button;
                        }
                    }
                } else {
                    for (const button of self._buttonsFlat) {
                        if (button.text == text) {
                            return button;
                        }
                    }
                }
                return;
            }
            if (filter != undefined) {
                for (const button of self._buttonsFlat) {
                    if (filter(button)) {
                        return button;
                    }
                }
                return;
            }
            if (i == undefined) {
                i = 0;
            }
            if (j == undefined) {
                return self._buttonsFlat[i];
            } else {
                return self._buttons[i][j];
            }
        }

        const button = findButton(this);
        if (button) {
            return await button.click({
                sharePhone: sharePhone,
                shareGeo: shareGeo,
                password: password,
            });
        }
    }

    /**
     * Helper methods to set the buttons given the input sender and chat.
     */
    _setButtons(chat: EntityLike, bot?: EntityLike) {
        if (
            this.client &&
            (this.replyMarkup instanceof Api.ReplyInlineMarkup ||
                this.replyMarkup instanceof Api.ReplyKeyboardMarkup)
        ) {
            this._buttons = [];
            this._buttonsFlat = [];
            for (const row of this.replyMarkup.rows) {
                const tmp = [];
                for (const button of row.buttons) {
                    const btn = new MessageButton(
                        this.client,
                        button,
                        chat,
                        bot,
                        this.id
                    );
                    tmp.push(btn);
                    this._buttonsFlat.push(btn);
                }
                this._buttons.push(tmp);
            }
        }
    }

    /**
     *Returns the input peer of the bot that's needed for the reply markup.

     This is necessary for `KeyboardButtonSwitchInline` since we need
     to know what bot we want to start. Raises ``Error`` if the bot
     cannot be found but is needed. Returns `None` if it's not needed.
     */
    _neededMarkupBot() {
        if (!this.client || this.replyMarkup == undefined) {
            return;
        }
        if (
            !(
                this.replyMarkup instanceof Api.ReplyInlineMarkup ||
                this.replyMarkup instanceof Api.ReplyKeyboardMarkup
            )
        ) {
            return;
        }
        for (const row of this.replyMarkup.rows) {
            for (const button of row.buttons) {
                if (button instanceof Api.KeyboardButtonSwitchInline) {
                    if (button.samePeer || !this.viaBotId) {
                        const bot = this._inputSender;
                        if (!bot) throw new Error("No input sender");
                        return bot;
                    } else {
                        const ent = this.client!._entityCache.get(
                            this.viaBotId
                        );
                        if (!ent) throw new Error("No input sender");
                        return ent;
                    }
                }
            }
        }
    }

    // TODO fix this

    _documentByAttribute(kind: Function, condition?: Function) {
        const doc = this.document;
        if (doc) {
            for (const attr of doc.attributes) {
                if (attr instanceof kind) {
                    if (
                        condition == undefined ||
                        (typeof condition == "function" && condition(attr))
                    ) {
                        return doc;
                    }
                    return undefined;
                }
            }
        }
    }
}
