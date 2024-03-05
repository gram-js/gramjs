"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGetter = void 0;
const __1 = require("../../");
const api_1 = require("../api");
const Helpers_1 = require("../../Helpers");
const inspect_1 = require("../../inspect");
class ChatGetter {
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    static initChatClass(c, { chatPeer, inputChat, chat, broadcast }) {
        c._chatPeer = chatPeer;
        c._inputChat = inputChat;
        c._chat = chat;
        c._broadcast = broadcast;
        c._client = undefined;
    }
    get chat() {
        return this._chat;
    }
    async getChat() {
        var _a;
        if (!this._chat ||
            ("min" in this._chat && (await this.getInputChat()))) {
            try {
                if (this._inputChat) {
                    this._chat = await ((_a = this._client) === null || _a === void 0 ? void 0 : _a.getEntity(this._inputChat));
                }
            }
            catch (e) {
                await this._refetchChat();
            }
        }
        return this._chat;
    }
    get inputChat() {
        if (!this._inputChat && this._chatPeer && this._client) {
            try {
                this._inputChat = this._client._entityCache.get(__1.utils.getPeerId(this._chatPeer));
            }
            catch (e) { }
        }
        return this._inputChat;
    }
    async getInputChat() {
        var e_1, _a;
        if (!this.inputChat && this.chatId && this._client) {
            try {
                const target = this.chatId;
                try {
                    for (var _b = __asyncValues(this._client.iterDialogs({
                        limit: 100,
                    })), _c; _c = await _b.next(), !_c.done;) {
                        const dialog = _c.value;
                        if (dialog.id.eq(target)) {
                            this._chat = dialog.entity;
                            this._inputChat = dialog.inputEntity;
                            break;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            catch (e) {
                // do nothing
            }
            return this._inputChat;
        }
        return this._inputChat;
    }
    get chatId() {
        return this._chatPeer
            ? (0, Helpers_1.returnBigInt)(__1.utils.getPeerId(this._chatPeer))
            : undefined;
    }
    get isPrivate() {
        return this._chatPeer
            ? this._chatPeer instanceof api_1.Api.PeerUser
            : undefined;
    }
    get isGroup() {
        if (!this._broadcast && this.chat && "broadcast" in this.chat) {
            this._broadcast = Boolean(this.chat.broadcast);
        }
        if (this._chatPeer instanceof api_1.Api.PeerChannel) {
            if (this._broadcast === undefined) {
                return undefined;
            }
            else {
                return !this._broadcast;
            }
        }
        return this._chatPeer instanceof api_1.Api.PeerChat;
    }
    get isChannel() {
        return this._chatPeer instanceof api_1.Api.PeerChannel;
    }
    async _refetchChat() { }
}
exports.ChatGetter = ChatGetter;
