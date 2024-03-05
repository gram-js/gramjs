"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomMessage = void 0;
const senderGetter_1 = require("./senderGetter");
const api_1 = require("../api");
const chatGetter_1 = require("./chatGetter");
const utils = __importStar(require("../../Utils"));
const forward_1 = require("./forward");
const file_1 = require("./file");
const Helpers_1 = require("../../Helpers");
const users_1 = require("../../client/users");
const Logger_1 = require("../../extensions/Logger");
const messageButton_1 = require("./messageButton");
const inspect_1 = require("../../inspect");
/**
 * This custom class aggregates both {@link Api.Message} and {@link Api.MessageService} to ease accessing their members.<br/>
 * <br/>
 * Remember that this class implements {@link ChatGetter} and {@link SenderGetter}<br/>
 * which means you have access to all their sender and chat properties and methods.
 */
class CustomMessage extends senderGetter_1.SenderGetter {
    constructor(args) {
        super();
        this.init(args);
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    init({ id, peerId = undefined, date = undefined, out = undefined, mentioned = undefined, mediaUnread = undefined, silent = undefined, post = undefined, fromId = undefined, replyTo = undefined, message = undefined, fwdFrom = undefined, viaBotId = undefined, media = undefined, replyMarkup = undefined, entities = undefined, views = undefined, editDate = undefined, postAuthor = undefined, groupedId = undefined, fromScheduled = undefined, legacy = undefined, editHide = undefined, pinned = undefined, restrictionReason = undefined, forwards = undefined, replies = undefined, action = undefined, reactions = undefined, noforwards = undefined, ttlPeriod = undefined, _entities = new Map(), }) {
        if (!id)
            throw new Error("id is a required attribute for Message");
        let senderId = undefined;
        if (fromId) {
            senderId = utils.getPeerId(fromId);
        }
        else if (peerId) {
            if (post || (!out && peerId instanceof api_1.Api.PeerUser)) {
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
        this.media = media instanceof api_1.Api.MessageMediaEmpty ? media : undefined;
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
        chatGetter_1.ChatGetter.initChatClass(this, { chatPeer: peerId, broadcast: post });
        senderGetter_1.SenderGetter.initSenderClass(this, {
            senderId: senderId ? (0, Helpers_1.returnBigInt)(senderId) : undefined,
        });
        this._forward = undefined;
    }
    _finishInit(client, entities, inputChat) {
        this._client = client;
        const cache = client._entityCache;
        if (this.senderId) {
            [this._sender, this._inputSender] = utils._getEntityPair(this.senderId.toString(), entities, cache);
        }
        if (this.chatId) {
            [this._chat, this._inputChat] = utils._getEntityPair(this.chatId.toString(), entities, cache);
        }
        if (inputChat) {
            // This has priority
            this._inputChat = inputChat;
        }
        if (this.viaBotId) {
            [this._viaBot, this._viaInputBot] = utils._getEntityPair(this.viaBotId.toString(), entities, cache);
        }
        if (this.fwdFrom) {
            this._forward = new forward_1.Forward(this._client, this.fwdFrom, entities);
        }
        if (this.action) {
            if (this.action instanceof api_1.Api.MessageActionChatAddUser ||
                this.action instanceof api_1.Api.MessageActionChatCreate) {
                this._actionEntities = this.action.users.map((i) => entities.get(i.toString()));
            }
            else if (this.action instanceof api_1.Api.MessageActionChatDeleteUser) {
                this._actionEntities = [
                    entities.get(this.action.userId.toString()),
                ];
            }
            else if (this.action instanceof api_1.Api.MessageActionChatJoinedByLink) {
                this._actionEntities = [
                    entities.get(utils.getPeerId(new api_1.Api.PeerChannel({
                        channelId: this.action.inviterId,
                    }))),
                ];
            }
            else if (this.action instanceof api_1.Api.MessageActionChannelMigrateFrom) {
                this._actionEntities = [
                    entities.get(utils.getPeerId(new api_1.Api.PeerChat({ chatId: this.action.chatId }))),
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
            }
            else {
                this._text = this._client.parseMode.unparse(this.message || "", this.entities || []);
            }
        }
        return this._text || "";
    }
    set text(value) {
        this._text = value;
        if (this._client && this._client.parseMode) {
            [this.message, this.entities] = this._client.parseMode.parse(value);
        }
        else {
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
    set rawText(value) {
        this.message = value;
        this.entities = [];
        this._text = "";
    }
    get isReply() {
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
        if (!this._client)
            return;
        let msg = undefined;
        try {
            const chat = this.isChannel ? await this.getInputChat() : undefined;
            let temp = await this._client.getMessages(chat, { ids: this.id });
            if (temp) {
                msg = temp[0];
            }
        }
        catch (e) {
            this._client._log.error("Got error while trying to finish init message with id " +
                this.id);
            if (this._client._log.canSend(Logger_1.LogLevel.ERROR)) {
                console.error(e);
            }
        }
        if (msg == undefined)
            return;
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
            }
            catch (e) {
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
            if (!chat)
                return;
            let bot;
            try {
                bot = this._neededMarkupBot();
            }
            catch (e) {
                await this._reloadMessage();
                bot = this._neededMarkupBot();
            }
            this._setButtons(chat, bot);
        }
        return this._buttons;
    }
    get buttonCount() {
        if (!this._buttonsCount) {
            if (this.replyMarkup instanceof api_1.Api.ReplyInlineMarkup ||
                this.replyMarkup instanceof api_1.Api.ReplyKeyboardMarkup) {
                this._buttonsCount = this.replyMarkup.rows
                    .map((r) => r.buttons.length)
                    .reduce(function (a, b) {
                    return a + b;
                }, 0);
            }
            else {
                this._buttonsCount = 0;
            }
        }
        return this._buttonsCount;
    }
    get file() {
        if (!this._file) {
            const media = this.photo || this.document;
            if (media) {
                this._file = new file_1.File(media);
            }
        }
        return this._file;
    }
    get photo() {
        if (this.media instanceof api_1.Api.MessageMediaPhoto) {
            if (this.media.photo instanceof api_1.Api.Photo)
                return this.media.photo;
        }
        else if (this.action instanceof api_1.Api.MessageActionChatEditPhoto) {
            return this.action.photo;
        }
        else {
            return this.webPreview && this.webPreview.photo instanceof api_1.Api.Photo
                ? this.webPreview.photo
                : undefined;
        }
        return undefined;
    }
    get document() {
        if (this.media instanceof api_1.Api.MessageMediaDocument) {
            if (this.media.document instanceof api_1.Api.Document)
                return this.media.document;
        }
        else {
            const web = this.webPreview;
            return web && web.document instanceof api_1.Api.Document
                ? web.document
                : undefined;
        }
        return undefined;
    }
    get webPreview() {
        if (this.media instanceof api_1.Api.MessageMediaWebPage) {
            if (this.media.webpage instanceof api_1.Api.WebPage)
                return this.media.webpage;
        }
    }
    get audio() {
        return this._documentByAttribute(api_1.Api.DocumentAttributeAudio, (attr) => !attr.voice);
    }
    get voice() {
        return this._documentByAttribute(api_1.Api.DocumentAttributeAudio, (attr) => !!attr.voice);
    }
    get video() {
        return this._documentByAttribute(api_1.Api.DocumentAttributeVideo);
    }
    get videoNote() {
        return this._documentByAttribute(api_1.Api.DocumentAttributeVideo, (attr) => !!attr.roundMessage);
    }
    get gif() {
        return this._documentByAttribute(api_1.Api.DocumentAttributeAnimated);
    }
    get sticker() {
        return this._documentByAttribute(api_1.Api.DocumentAttributeSticker);
    }
    get contact() {
        if (this.media instanceof api_1.Api.MessageMediaContact) {
            return this.media;
        }
    }
    get game() {
        if (this.media instanceof api_1.Api.MessageMediaGame) {
            return this.media.game;
        }
    }
    get geo() {
        if (this.media instanceof api_1.Api.MessageMediaGeo ||
            this.media instanceof api_1.Api.MessageMediaGeoLive ||
            this.media instanceof api_1.Api.MessageMediaVenue) {
            return this.media.geo;
        }
    }
    get invoice() {
        if (this.media instanceof api_1.Api.MessageMediaInvoice) {
            return this.media;
        }
    }
    get poll() {
        if (this.media instanceof api_1.Api.MessageMediaPoll) {
            return this.media;
        }
    }
    get venue() {
        if (this.media instanceof api_1.Api.MessageMediaVenue) {
            return this.media;
        }
    }
    get dice() {
        if (this.media instanceof api_1.Api.MessageMediaDice) {
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
        var _a;
        return (_a = this.replyTo) === null || _a === void 0 ? void 0 : _a.replyToMsgId;
    }
    get toId() {
        if (this._client && !this.out && this.isPrivate) {
            return new api_1.Api.PeerUser({
                userId: (0, users_1._selfId)(this._client),
            });
        }
        return this.peerId;
    }
    getEntitiesText(cls) {
        let ent = this.entities;
        if (!ent || ent.length == 0)
            return;
        if (cls) {
            ent = ent.filter((v) => v instanceof cls);
        }
        const texts = utils.getInnerText(this.message || "", ent);
        const zip = (rows) => rows[0].map((_, c) => rows.map((row) => row[c]));
        return zip([ent, texts]);
    }
    async getReplyMessage() {
        if (!this._replyMessage && this._client) {
            if (!this.replyTo)
                return undefined;
            // Bots cannot access other bots' messages by their ID.
            // However they can access them through replies...
            this._replyMessage = (await this._client.getMessages(this.isChannel ? await this.getInputChat() : undefined, {
                ids: new api_1.Api.InputMessageReplyTo({ id: this.id }),
            }))[0];
            if (!this._replyMessage) {
                // ...unless the current message got deleted.
                //
                // If that's the case, give it a second chance accessing
                // directly by its ID.
                this._replyMessage = (await this._client.getMessages(this.isChannel ? this._inputChat : undefined, {
                    ids: this.replyToMsgId,
                }))[0];
            }
        }
        return this._replyMessage;
    }
    async respond(params) {
        if (this._client) {
            return this._client.sendMessage((await this.getInputChat()), params);
        }
    }
    async reply(params) {
        if (this._client) {
            params.replyTo = this.id;
            return this._client.sendMessage((await this.getInputChat()), params);
        }
    }
    async forwardTo(entity) {
        if (this._client) {
            entity = await this._client.getInputEntity(entity);
            const params = {
                messages: [this.id],
                fromPeer: (await this.getInputChat()),
            };
            return this._client.forwardMessages(entity, params);
        }
    }
    async edit(params) {
        const param = params;
        if (this.fwdFrom || !this.out || !this._client)
            return undefined;
        if (param.linkPreview == undefined) {
            param.linkPreview = !!this.webPreview;
        }
        if (param.buttons == undefined) {
            param.buttons = this.replyMarkup;
        }
        param.message = this.id;
        return this._client.editMessage((await this.getInputChat()), param);
    }
    async delete({ revoke } = { revoke: false }) {
        if (this._client) {
            return this._client.deleteMessages(await this.getInputChat(), [this.id], {
                revoke,
            });
        }
    }
    async pin(params) {
        if (this._client) {
            const entity = await this.getInputChat();
            if (entity === undefined) {
                throw Error("Failed to pin message due to cannot get input chat.");
            }
            return this._client.pinMessage(entity, this.id, params);
        }
    }
    async unpin(params) {
        if (this._client) {
            const entity = await this.getInputChat();
            if (entity === undefined) {
                throw Error("Failed to unpin message due to cannot get input chat.");
            }
            return this._client.unpinMessage(entity, this.id, params);
        }
    }
    async downloadMedia(params) {
        // small hack for patched method
        if (this._client)
            return this._client.downloadMedia(this, params || {});
    }
    async markAsRead() {
        if (this._client) {
            const entity = await this.getInputChat();
            if (entity === undefined) {
                throw Error(`Failed to mark message id ${this.id} as read due to cannot get input chat.`);
            }
            return this._client.markAsRead(entity, this.id);
        }
    }
    async click({ i, j, text, filter, data, sharePhone, shareGeo, password, }) {
        if (!this.client) {
            return;
        }
        if (data) {
            const chat = await this.getInputChat();
            if (!chat) {
                return;
            }
            const button = new api_1.Api.KeyboardButtonCallback({
                text: "",
                data: data,
            });
            return await new messageButton_1.MessageButton(this.client, button, chat, undefined, this.id).click({
                sharePhone: sharePhone,
                shareGeo: shareGeo,
                password: password,
            });
        }
        if (this.poll) {
            function findPoll(answers) {
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
                    }
                    else {
                        for (const answer of answers) {
                            if (answer.text == text) {
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
            return await this.client.invoke(new api_1.Api.messages.SendVote({
                peer: this.inputChat,
                msgId: this.id,
                options: options,
            }));
        }
        if (!(await this.getButtons())) {
            return; // Accessing the property sets this._buttons[_flat]
        }
        function findButton(self) {
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
                }
                else {
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
            }
            else {
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
    _setButtons(chat, bot) {
        if (this.client &&
            (this.replyMarkup instanceof api_1.Api.ReplyInlineMarkup ||
                this.replyMarkup instanceof api_1.Api.ReplyKeyboardMarkup)) {
            this._buttons = [];
            this._buttonsFlat = [];
            for (const row of this.replyMarkup.rows) {
                const tmp = [];
                for (const button of row.buttons) {
                    const btn = new messageButton_1.MessageButton(this.client, button, chat, bot, this.id);
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
        if (!(this.replyMarkup instanceof api_1.Api.ReplyInlineMarkup ||
            this.replyMarkup instanceof api_1.Api.ReplyKeyboardMarkup)) {
            return;
        }
        for (const row of this.replyMarkup.rows) {
            for (const button of row.buttons) {
                if (button instanceof api_1.Api.KeyboardButtonSwitchInline) {
                    if (button.samePeer || !this.viaBotId) {
                        const bot = this._inputSender;
                        if (!bot)
                            throw new Error("No input sender");
                        return bot;
                    }
                    else {
                        const ent = this.client._entityCache.get(this.viaBotId);
                        if (!ent)
                            throw new Error("No input sender");
                        return ent;
                    }
                }
            }
        }
    }
    // TODO fix this
    _documentByAttribute(kind, condition) {
        const doc = this.document;
        if (doc) {
            for (const attr of doc.attributes) {
                if (attr instanceof kind) {
                    if (condition == undefined ||
                        (typeof condition == "function" && condition(attr))) {
                        return doc;
                    }
                    return undefined;
                }
            }
        }
    }
}
exports.CustomMessage = CustomMessage;
