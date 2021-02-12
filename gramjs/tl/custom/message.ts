import {SenderGetter} from "./senderGetter";
import {DateLike, EntitiesLike, Entity, EntityLike} from "../../define";
import {Api} from "../api";
import MessageMediaEmpty = Api.MessageMediaEmpty;
import PeerUser = Api.PeerUser;
import {TelegramClient} from "../../client/TelegramClient";
import {ChatGetter} from "./chatGetter";
import * as utils from "../../Utils";
import {Forward} from "./forward";
import {File} from "./file";
import {getInnerText} from "../../Utils";
import {Mixin} from "ts-mixer";

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
    replies?: any;
    action?: any;
    _entities?: any;
}


export class Message extends Mixin(SenderGetter, ChatGetter) {
    out?: boolean;
    mentioned?: boolean;
    mediaUnread?: boolean;
    silent?: boolean;
    post: boolean;
    fromScheduled: any | undefined;
    legacy: any | undefined;
    editHide: any | undefined;
    id: number;
    fromId?: EntityLike;
    peerId: any;
    fwdFrom: any;
    viaBotId: any;
    replyTo: Api.MessageReplyHeader;
    date: any | undefined;
    message: any | undefined;
    media: any;
    replyMarkup: any | undefined;
    entities: any | undefined;
    views: any | undefined;
    forwards: any | undefined;
    replies: any | undefined;
    editDate: any;
    pinned: any | undefined;
    postAuthor: any;
    groupedId: any;
    restrictionReason: any;
    action: any | undefined;
    _actionEntities: any;
    public _client?: TelegramClient;
    _text?: string;
    _file?: File;
    _replyMessage: null;
    _buttons: null;
    _buttonsFlat: null;
    _buttonsCount: number;
    _viaBot?: EntityLike;
    _viaInputBot?: EntityLike;
    _inputSender: any;
    _forward?: Forward;
    _sender: any;
    _entities: any[]

    constructor(
        {
            id,
            peerId = undefined, date = null,

            out = null, mentioned = null, mediaUnread = null, silent = null,
            post = null, fromId = null, replyTo = null,

            message = null,


            fwdFrom = null, viaBotId = null, media = null, replyMarkup = null,
            entities = null, views = null, editDate = null, postAuthor = null,
            groupedId = null, fromScheduled = null, legacy = null,
            editHide = null, pinned = null, restrictionReason = null, forwards = null, replies = null,


            action = null,


            _entities = [],
        }: MessageBaseInterface) {
        if (!id) throw new TypeError('id is a required attribute for Message');
        let senderId = undefined;
        if (fromId) {
            senderId = utils.getPeerId(fromId);
        } else if (peerId) {
            if (post || (!out && peerId instanceof PeerUser)) {
                senderId = utils.getPeerId(peerId);
            }
        }
        // @ts-ignore
        super({chatPeer: peerId, broadcast: post, senderId: senderId});
        // Common properties to all messages
        this._entities = _entities;
        this.out = out;
        this.mentioned = mentioned;
        this.mediaUnread = mediaUnread;
        this.silent = silent;
        this.post = post;
        this.fromScheduled = fromScheduled;
        this.legacy = legacy;
        this.editHide = editHide;
        this.id = id;
        this.fromId = fromId;
        this.peerId = peerId;
        this.fwdFrom = fwdFrom;
        this.viaBotId = viaBotId;
        this.replyTo = replyTo;
        this.date = date;
        this.message = message;
        this.media = media instanceof MessageMediaEmpty ? media : null;
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

        this._client = undefined;
        this._text = undefined;
        this._file = undefined;
        this._replyMessage = null;
        this._buttons = null;
        this._buttonsFlat = null;
        this._buttonsCount = 0;
        this._viaBot = undefined;
        this._viaInputBot = undefined;
        this._actionEntities = null;


        // Note: these calls would reset the client
        ChatGetter.initClass(this, {chatPeer: peerId, broadcast: post});
        SenderGetter.initClass(this, {senderId: senderId});

        this._forward = undefined
    }


    _finishInit(client: TelegramClient, entities: Map<number, Entity>, inputChat: EntityLike) {
        this._client = client;
        const cache = client._entityCache;

        if (this.senderId) {
            [this._sender, this._inputSender] = utils._getEntityPair(this.senderId, entities, cache);
        }
        if (this.chatId) {
            [this._chat, this._inputChat] = utils._getEntityPair(this.chatId, entities, cache);

        }

        if (inputChat) { // This has priority
            this._inputChat = inputChat;
        }

        if (this.viaBotId) {
            [this._viaBot, this._viaInputBot] = utils._getEntityPair(this.viaBotId, entities, cache)
        }

        if (this.fwdFrom) {
            this._forward = new Forward(this._client, this.fwdFrom, this.entities)
        }

        if (this.action) {
            if ((this.action instanceof Api.MessageActionChatAddUser) ||
                (this.action instanceof Api.MessageActionChatCreate)) {
                this._actionEntities = this.action.users.map((i) => entities.get(i))
            } else if (this.action instanceof Api.MessageActionChatDeleteUser) {
                this._actionEntities = [entities.get(this.action.userId)]
            } else if (this.action instanceof Api.MessageActionChatJoinedByLink) {
                this._actionEntities = [entities.get(utils.getPeerId(
                    new Api.PeerChannel({channelId: this.action.inviterId}),
                ))]
            } else if (this.action instanceof Api.MessageActionChannelMigrateFrom) {
                this._actionEntities = [entities.get(utils.getPeerId(
                    new Api.PeerChat({chatId: this.action.chatId})),
                )]
            }
        }
    }

    get client() {
        return this._client
    }

    get text() {
        if (!this._text && this._client) {
            if (!this._client.parseMode) {
                this._text = this.message
            } else {
                this._text = this._client.parseMode.unparse(this.message, this.entities)
            }
        }
        return this._text || '';
    }

    set text(value: string) {
        this._text = value;
        if (this._client && this._client.parseMode) {
            [this.message, this.entities] = this._client.parseMode.parse(value);
        } else {
            this.message = value;
            this.entities = []
        }
    }

    get rawText() {
        return this.message
    }

    /**
     * @param {string} value
     */
    set rawText(value: string) {
        this.message = value;
        this.entities = [];
        this._text = ''
    }

    get isReply(): boolean {
        return !!this.replyTo;
    }

    get forward() {
        return this._forward
    }

    /*

        get buttons() {
            if (!this._buttons && this.replyMarkup) {
                if (!this.inputChat) {
                    return null
                }

                const bot = this._neededMarkupBot();
                if (!bot) {
                    this._setButtons(this._inputChat, bot)
                }
            }
            return this._buttons
        }
        async getButtons() {
            if (!this.buttons && this.replyMarkup) {
                const chat = await this.getInputChat();
                if (!chat) return;
                let bot = this._neededMarkupBot();
                if (!bot) {
                    await this._reloadMessage();
                    bot = this._neededMarkupBot()
                }
                this._setButtons(chat, bot)
            }
            return this._buttons
        }
    /
        get buttonCount() {
            if (!this._buttonsCount) {
                if ((this.replyMarkup instanceof Api.ReplyInlineMarkup) ||
                    (this.replyMarkup instanceof Api.ReplyKeyboardMarkup)) {
                    this._buttonsCount = (this.replyMarkup.rows.map((r) => r.buttons.length)).reduce(function (a, b) {
                        return a + b;
                    }, 0);
                } else {
                    this._buttonsCount = 0
                }
            }
            return this._buttonsCount
        }

        get file() {
            if (!this._file) {
                const media = this.photo || this.document;
                if (media) {
                    this._file = new File(media);
                }
            }
            return this._file
        }

        get photo() {
            if (this.media instanceof Api.MessageMediaPhoto) {
                if (this.media.photo instanceof Api.Photo)
                    return this.media.photo
            } else if (this.action instanceof Api.MessageActionChatEditPhoto) {
                return this.action.photo
            } else {
                return this.webPreview && this.webPreview instanceof Api.Photo
                    ? this.webPreview.photo
                    : null
            }
            return null
        }

        get document() {
            if (this.media instanceof Api.MessageMediaDocument) {
                if (this.media.document instanceof Api.Document)
                    return this.media.document
            } else {
                const web = this.webPreview;

                return web && web.document instanceof Api.Document
                    ? web.document
                    : null
            }
            return null
        }

        get webPreview() {
            if (this.media instanceof Api.MessageMediaWebPage) {
                if (this.media.webpage instanceof Api.WebPage)
                    return this.media.webpage
            }
        }
        /* REFACTOR

            get audio() {
                return this._documentByAttribute(Api.DocumentAttributeAudio, (attr: Api.DocumentAttributeAudio) => !attr.voice)
            }

            get voice() {
                return this._documentByAttribute(Api.DocumentAttributeAudio, (attr: Api.DocumentAttributeAudio) => !!attr.voice)
            }

            get video() {
                return this._documentByAttribute(Api.DocumentAttributeVideo)
            }

            get videoNote() {
                return this._documentByAttribute(Api.DocumentAttributeVideo, (attr: Api.DocumentAttributeVideo) => !!attr.roundMessage)
            }

            get gif() {
                return this._documentByAttribute(Api.DocumentAttributeAnimated)
            }

            get sticker() {
                return this._documentByAttribute(Api.DocumentAttributeSticker)
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
                if ((this.media instanceof Api.MessageMediaGeo) ||
                    (this.media instanceof Api.MessageMediaGeoLive) ||
                    (this.media instanceof Api.MessageMediaVenue)) {
                    return this.media.geo
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
                return this._actionEntities
            }

            get viaBot() {
                return this._viaBot
            }

            get viaInputBot() {
                return this._viaInputBot
            }

            get replyToMsgId() {
                return this.replyTo?.replyToMsgId;
            }

            get toId() {
                if (this._client && !this.out && this.is) {
                    return new Api.PeerUser({
                        userId: this._client._selfId,
                    });
                }
                return this.peerId;
            }

            getEntitiesText(cls: any = null) {
                let ent = this.entities;
                if (!ent || ent.length == 0) return;

                if (cls)
                    ent = ent.filter((v: any) => v instanceof cls);

                const texts = getInnerText(this.message, ent);
                const zip = (rows: any[]) => rows[0].map((_: any, c: string | number) => rows.map(row => row[c]));

                return zip([ent, texts]);
            }

            async getReplyMessage() {
                if (!this._replyMessage && this._client) {
                    if (!this.replyTo) return null;

                    // Bots cannot access other bots' messages by their ID.
                    // However they can access them through replies...
                    this._replyMessage = await this._client.getMessages(
                        this.isChannel ? await this.getInputChat() : null, {
                            ids: Api.InputMessageReplyTo({id: this.id})
                        });

                    if (!this._replyMessage) {
                        // ...unless the current message got deleted.
                        //
                        // If that's the case, give it a second chance accessing
                        // directly by its ID.
                        this._replyMessage = await this._client.getMessages(
                            this.isChannel ? this._inputChat : null, {
                                ids: this.replyToMsgId
                            })
                    }
                }
                return this._replyMessage
            }

            async respond(args) {
                if (this._client) {
                    args.entity = await this.getInputChat();
                    return this._client.sendMessage(args)
                }
            }

            async reply(args) {
                if (this._client) {
                    args.replyTo = this.id;
                    args.entity = await this.getInputChat();
                    return this._client.sendMessage(args)
                }
            }

            async forwardTo(args) {
                if (this._client) {
                    args.messages = this.id;
                    args.fromPeer = await this.getInputChat();
                    return this._client.forwardMessages(args)
                }
            }

            async edit(args) {
                if (this.fwdFrom || !this.out || !this._client) return null;
                args.entity = await this.getInputChat();
                args.message = this.id;

                if (!('linkPreview' in args))
                    args.linkPreview = !!this.webPreview;

                if (!('buttons' in args))
                    args.buttons = this.replyMarkup;

                return this._client.editMessage(args)
            }

            async delete(args) {
                if (this._client) {
                    args.entity = await this.getInputChat();
                    args.messages = [this.id];
                    return this._client.deleteMessages(args)
                }
            }

            async downloadMedia(args) {
                if (this._client)
                    return this._client.downloadMedia(args)
            }
            async click({i = null, j = null, text = null, filter = null, data = null}) {
                if (!this._client) return;

                if (data) {
                    if (!(await this._getInputChat()))
                        return null;

                    try {
                        return await this._client.invoke(functions.messages.GetBotCallbackAnswerRequest({
                            peer: this._inputChat,
                            msgId: this.id,
                            data: data,
                        }))
                    } catch (e) {
                        if (e instanceof errors.BotTimeout)
                            return null
                    }
                }

                if ([i, text, filter].filter((x) => !!x) > 1)
                    throw new Error('You can only set either of i, text or filter');

                if (!(await this.getButtons()))
                    return;

                if (text) {
                    if (callable(text)) {
                        for (const button of this._buttonsFlat) {
                            if (text(button.text)) {
                                return button.click()
                            }
                        }
                    } else {
                        for (const button of this._buttonsFlat) {
                            if (button.text === text) {
                                return button.click()
                            }
                        }
                    }
                }

                if (filter && callable(filter)) {
                    for (const button of this._buttonsFlat) {
                        if (filter(button)) {
                            return button.click()
                        }
                    }
                    return null
                }

                i = !i ? 0 : i;
                if (!j) return this._buttonsFlat[i].click();
                else return this._buttons[i][j].click()
            }

            async markRead() {
                if (this._client) {
                    await this._client.sendReadAcknowledge({
                        entity: await this.getInputChat(),
                        maxId: this.id,
                    })
                }
            }

            async pin(notify = false) {
                if (this._client) {
                    await this._client.pinMessage({
                        entity: await this.getInputChat(),
                        message: this.id,
                        notify: notify,
                    })
                }
            }

            async _reloadMessage() {
                if (!this._client) return;

                const chat = this.isChannel ? this.getInputChat() : null;
                const msg = this._client.getMessages({chat, ids: this.id});

                if (!msg) return;

                this._sender = msg._sender;
                this._inputSender = msg._inputender;
                this._chat = msg._chat;
                this._inputChat = msg._inputChat;
                this._viaBot = msg._viaBot;
                this._viaInputBot = msg._viaInputBot;
                this._forward = msg._forward;
                this._actionEntities = msg._actionEntities
            }

            async _refetchSender() {
                await this._reloadMessage()
            }

            _setButtons(chat, bot) {
                // TODO: Implement MessageButton
                // if (this._client && (this.replyMarkup instanceof types.ReplyInlineMarkup ||
                //         this.replyMarkup instanceof types.ReplyKeyboardMarkup)) {
                //     this._buttons = this.replyMarkup.rows.map((row) =>
                //         row.buttons.map((button) => new Messagebutton(this._client, button, chat, bot, this.id)))
                // }
                // this._buttonsFlat = this._buttons.flat()
            }

            _neededMarkupBot() {
                if (this._client && !(this.replyMarkup instanceof types.ReplyInlineMarkup ||
                    this.replyMarkup instanceof types.ReplyKeyboardMarkup)) {
                    return null
                }

                for (const row of this.replyMarkup.rows) {
                    for (const button of row.buttons) {
                        if (button instanceof types.KeyboardButtonSwitchInline) {
                            if (button.samePeer) {
                                const bot = this._inputSender;
                                if (!bot) throw new Error('No input sender');
                                return bot
                            } else {
                                const ent = this._client._entityCache[this.viaBotId];
                                if (!ent) throw new Error('No input sender');
                                return ent
                            }
                        }
                    }
                }
            }
            // TODO fix this

            _documentByAttribute(kind, condition = null) {
                const doc = this.document;
                if (doc) {
                    for (const attr of doc.attributes) {
                        if (attr instanceof kind) {
                            if (!condition || (callable(condition) && condition(attr))) {
                                return doc
                            }
                            return null
                        }
                    }
                }
            }*/
}

export interface Message extends ChatGetter, SenderGetter {
}
