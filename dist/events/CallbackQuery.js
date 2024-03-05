"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallbackQueryEvent = exports.CallbackQuery = exports.NewCallbackQueryDefaults = void 0;
const common_1 = require("./common");
const tl_1 = require("../tl");
const Helpers_1 = require("../Helpers");
const Utils_1 = require("../Utils");
exports.NewCallbackQueryDefaults = {
    chats: [],
    fromUsers: [],
    blacklistUsers: [],
};
/**
 * Occurs whenever you sign in as a bot and a user
 * clicks one of the inline buttons on your messages.
 * Note that the `chats` parameter will **not** work with normal
 * IDs or peers if the clicked inline button comes from a "via bot"
 * message. The `chats` parameter also supports checking against the
 * `chat_instance` which should be used for inline callbacks.
 *
 * @example
 * ```ts
 * async function printQuery(event: NewCallbackQueryEvent) {
 *     // TODO
 * }
 * ```
 */
class CallbackQuery extends common_1.EventBuilder {
    constructor(inlineQueryParams = {}) {
        const { chats, func, pattern } = inlineQueryParams;
        super({ chats, func, blacklistChats: false });
        this.match = pattern;
        this._noCheck = [this.chats, this.func, this.match].every((i) => i === null || i === undefined);
    }
    build(update, callback, selfId = undefined) {
        if (update instanceof tl_1.Api.UpdateBotCallbackQuery) {
            return new CallbackQueryEvent(update, update.peer, update.msgId);
        }
        else if (update instanceof tl_1.Api.UpdateInlineBotCallbackQuery) {
            const b = (0, Helpers_1.toSignedLittleBuffer)(update.msgId.id, 8);
            const msgId = b.readInt32LE(0);
            const peerId = b.readInt32LE(4);
            const peer = peerId < 0
                ? new tl_1.Api.PeerChannel({ channelId: (0, Helpers_1.returnBigInt)(-peerId) })
                : new tl_1.Api.PeerUser({ userId: (0, Helpers_1.returnBigInt)(peerId) });
            return new CallbackQueryEvent(update, peer, msgId);
        }
    }
    filter(event) {
        if (this._noCheck)
            return event;
        if (this.chats) {
            let inside = this.chats.includes(event.query.chatInstance.toString());
            if (event.chatId) {
                inside = inside || this.chats.includes(event.chatId.toString());
            }
            if (inside === this.blacklistChats) {
                return;
            }
        }
        if (this.match) {
            const data = new TextDecoder().decode(event.query.data);
            const result = this.match.exec(data);
            this.match.lastIndex = 0;
            if (result) {
                event.patternMatch = result;
            }
            else {
                return;
            }
        }
        if (this.func) {
            return this.func(event);
        }
        return true;
    }
}
exports.CallbackQuery = CallbackQuery;
class CallbackQueryEvent extends common_1.EventCommonSender {
    constructor(query, peer, msgId) {
        super({
            msgId,
            chatPeer: peer,
            broadcast: false,
        });
        this.query = query;
        this.patternMatch = undefined;
        this._senderId = (0, Helpers_1.returnBigInt)(query.userId);
        this._message = undefined;
        this._answered = false;
    }
    _setClient(client) {
        super._setClient(client);
        const [sender, inputSender] = (0, Utils_1._getEntityPair)(this._senderId.toString(), this._entities, client._entityCache);
        this._sender = sender;
        this._inputSender = inputSender;
    }
    get id() {
        return this.query.queryId;
    }
    get messageId() {
        return this._messageId;
    }
    get data() {
        return this.query.data;
    }
    get chatInstance() {
        return this.query.chatInstance;
    }
    async getMessage() {
        if (this._message) {
            return this._message;
        }
        const chat = this.isChannel ? await this.getInputChat() : undefined;
        const messages = await this._client.getMessages(chat, {
            ids: this._messageId,
        });
        this._message = messages[0];
        return this._message;
    }
    async _refetchSender() {
        if (this._entities.has(this.senderId.toString())) {
            this._sender = this._entities.get(this.senderId.toString());
        }
        if (!this._sender)
            return;
        this._inputSender = (0, Utils_1.getInputPeer)(this._chat);
        if (!this._inputSender.hasOwnProperty("accessHash")) {
            try {
                this._inputSender = this._client._entityCache.get(this._senderId);
            }
            catch (e) {
                const m = await this.getMessage();
                if (m) {
                    this._sender = m._sender;
                    this._inputSender = m._inputSender;
                }
            }
        }
    }
    async answer({ message, cacheTime, url, alert, } = {}) {
        if (this._answered)
            return;
        return await this._client.invoke(new tl_1.Api.messages.SetBotCallbackAnswer({
            queryId: this.query.queryId,
            cacheTime,
            alert,
            message,
            url,
        })).then((res) => {
            this._answered = true;
            return res;
        });
    }
    get viaInline() {
        return this.query instanceof tl_1.Api.UpdateInlineBotCallbackQuery;
    }
    async respond(params = {}) {
        await this.answer();
        const inputChat = await this.getInputChat();
        await this._client.sendMessage(inputChat, params);
    }
    async reply(params = {}) {
        await this.answer();
        params.replyTo = this.messageId;
        const inputChat = await this.getInputChat();
        await this._client.sendMessage(inputChat, params);
    }
    async edit(params) {
        if (this.query.msgId instanceof tl_1.Api.InputBotInlineMessageID) {
            return await this._client.editMessage(this.messageId, params).then(async (res) => {
                await this.answer();
                return res;
            });
        }
        else {
            const inputChat = await this.getInputChat();
            return await this._client.editMessage(inputChat, params).then(async (res) => {
                await this.answer();
                return res;
            });
        }
    }
    async delete({ revoke } = { revoke: false }) {
        if (this._client) {
            return this._client.deleteMessages(await this.getInputChat(), [this.messageId], { revoke });
        }
    }
    get sender() {
        return this._sender;
    }
}
exports.CallbackQueryEvent = CallbackQueryEvent;
