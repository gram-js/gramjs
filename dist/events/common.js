"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCommonSender = exports.EventCommon = exports.EventBuilder = exports._intoIdSet = void 0;
const tl_1 = require("../tl");
const custom_1 = require("../tl/custom");
const Helpers_1 = require("../Helpers");
const __1 = require("../");
const senderGetter_1 = require("../tl/custom/senderGetter");
const big_integer_1 = __importDefault(require("big-integer"));
const Utils_1 = require("../Utils");
/** @hidden */
async function _intoIdSet(client, chats) {
    if (chats == undefined) {
        return undefined;
    }
    if (!(0, Helpers_1.isArrayLike)(chats)) {
        chats = [chats];
    }
    const result = new Set();
    for (let chat of chats) {
        if (typeof chat == "number" ||
            typeof chat == "bigint" ||
            (typeof chat == "string" && (0, Utils_1.parseID)(chat)) ||
            big_integer_1.default.isInstance(chat)) {
            chat = (0, Helpers_1.returnBigInt)(chat);
            if (chat.lesser(0)) {
                result.add(chat.toString());
            }
            else {
                result.add(__1.utils.getPeerId(new tl_1.Api.PeerUser({
                    userId: chat,
                })));
                result.add(__1.utils.getPeerId(new tl_1.Api.PeerChat({
                    chatId: chat,
                })));
                result.add(__1.utils.getPeerId(new tl_1.Api.PeerChannel({
                    channelId: chat,
                })));
            }
        }
        else if (typeof chat == "object" &&
            chat.SUBCLASS_OF_ID == 0x2d45687) {
            result.add(__1.utils.getPeerId(chat));
        }
        else {
            chat = await client.getInputEntity(chat);
            if (chat instanceof tl_1.Api.InputPeerSelf) {
                chat = await client.getMe(true);
            }
            result.add(__1.utils.getPeerId(chat));
        }
    }
    return Array.from(result);
}
exports._intoIdSet = _intoIdSet;
/**
 * The common event builder, with builtin support to filter per chat.<br/>
 * All events inherit this.
 */
class EventBuilder {
    constructor(eventParams) {
        var _a;
        this.chats = (_a = eventParams.chats) === null || _a === void 0 ? void 0 : _a.map((x) => x.toString());
        this.blacklistChats = eventParams.blacklistChats || false;
        this.resolved = false;
        this.func = eventParams.func;
    }
    build(update, callback, selfId) {
        if (update)
            return update;
    }
    async resolve(client) {
        if (this.resolved) {
            return;
        }
        await this._resolve(client);
        this.resolved = true;
    }
    async _resolve(client) {
        this.chats = await _intoIdSet(client, this.chats);
    }
    filter(event) {
        if (!this.resolved) {
            return;
        }
        if (this.chats != undefined) {
            if (event.chatId == undefined) {
                return;
            }
            const inside = this.chats.includes(event.chatId.toString());
            if (inside == this.blacklistChats) {
                // If this chat matches but it's a blacklist ignore.
                // If it doesn't match but it's a whitelist ignore.
                return;
            }
        }
        if (this.func && !this.func(event)) {
            return;
        }
        return event;
    }
}
exports.EventBuilder = EventBuilder;
class EventCommon extends custom_1.ChatGetter {
    constructor({ chatPeer = undefined, msgId = undefined, broadcast = undefined, }) {
        super();
        this._eventName = "Event";
        custom_1.ChatGetter.initChatClass(this, { chatPeer, broadcast });
        this._entities = new Map();
        this._client = undefined;
        this._messageId = msgId;
    }
    _setClient(client) {
        this._client = client;
    }
    get client() {
        return this._client;
    }
}
exports.EventCommon = EventCommon;
class EventCommonSender extends senderGetter_1.SenderGetter {
    constructor({ chatPeer = undefined, msgId = undefined, broadcast = undefined, }) {
        super();
        this._eventName = "Event";
        custom_1.ChatGetter.initChatClass(this, { chatPeer, broadcast });
        senderGetter_1.SenderGetter.initChatClass(this, { chatPeer, broadcast });
        this._entities = new Map();
        this._client = undefined;
        this._messageId = msgId;
    }
    _setClient(client) {
        this._client = client;
    }
    get client() {
        return this._client;
    }
}
exports.EventCommonSender = EventCommonSender;
