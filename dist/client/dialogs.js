"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDialogs = exports.iterDialogs = exports._DialogsIter = void 0;
const tl_1 = require("../tl");
const requestIter_1 = require("../requestIter");
const index_1 = require("../index");
const dialog_1 = require("../tl/custom/dialog");
const big_integer_1 = __importDefault(require("big-integer"));
const Logger_1 = require("../extensions/Logger");
const _MAX_CHUNK_SIZE = 100;
/**
 Get the key to get messages from a dialog.

 We cannot just use the message ID because channels share message IDs,
 and the peer ID is required to distinguish between them. But it is not
 necessary in small group chats and private chats.
 * @param {Api.TypePeer} [peer] the dialog peer
 * @param {number} [messageId] the message id
 * @return {[number,number]} the channel id and message id
 */
function _dialogMessageKey(peer, messageId) {
    // can't use arrays as keys for map :( need to convert to string.
    return ("" +
        [
            peer instanceof tl_1.Api.PeerChannel ? peer.channelId : undefined,
            messageId,
        ]);
}
class _DialogsIter extends requestIter_1.RequestIter {
    async _init({ offsetDate, offsetId, offsetPeer, ignorePinned, ignoreMigrated, folder, }) {
        this.request = new tl_1.Api.messages.GetDialogs({
            offsetDate,
            offsetId,
            offsetPeer,
            limit: 1,
            hash: big_integer_1.default.zero,
            excludePinned: ignorePinned,
            folderId: folder,
        });
        if (this.limit <= 0) {
            // Special case, get a single dialog and determine count
            const dialogs = await this.client.invoke(this.request);
            if ("count" in dialogs) {
                this.total = dialogs.count;
            }
            else {
                this.total = dialogs.dialogs.length;
            }
            return true;
        }
        this.seen = new Set();
        this.offsetDate = offsetDate;
        this.ignoreMigrated = ignoreMigrated;
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
    async _loadNextChunk() {
        var _a;
        if (!this.request || !this.seen || !this.buffer) {
            return;
        }
        this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
        const r = await this.client.invoke(this.request);
        if (r instanceof tl_1.Api.messages.DialogsNotModified) {
            return;
        }
        if ("count" in r) {
            this.total = r.count;
        }
        else {
            this.total = r.dialogs.length;
        }
        const entities = new Map();
        const messages = new Map();
        for (const entity of [...r.users, ...r.chats]) {
            if (entity instanceof tl_1.Api.UserEmpty ||
                entity instanceof tl_1.Api.ChatEmpty) {
                continue;
            }
            entities.set(index_1.utils.getPeerId(entity), entity);
        }
        for (const m of r.messages) {
            let message = m;
            try {
                if (message && "_finishInit" in message) {
                    // todo make sure this never fails
                    message._finishInit(this.client, entities, undefined);
                }
            }
            catch (e) {
                console.log("msg", message);
                this.client._log.error("Got error while trying to finish init message with id " +
                    m.id);
                if (this.client._log.canSend(Logger_1.LogLevel.ERROR)) {
                    console.error(e);
                }
                if (this.client._errorHandler) {
                    await this.client._errorHandler(e);
                }
            }
            messages.set(_dialogMessageKey(message.peerId, message.id), message);
        }
        for (const d of r.dialogs) {
            if (d instanceof tl_1.Api.DialogFolder) {
                continue;
            }
            const message = messages.get(_dialogMessageKey(d.peer, d.topMessage));
            if (this.offsetDate != undefined) {
                const date = message === null || message === void 0 ? void 0 : message.date;
                if (date == undefined || date > this.offsetDate) {
                    continue;
                }
            }
            const peerId = index_1.utils.getPeerId(d.peer);
            if (!this.seen.has(peerId)) {
                this.seen.add(peerId);
                if (!entities.has(peerId)) {
                    /*
                     > In which case can a UserEmpty appear in the list of banned members?
                     > In a very rare cases. This is possible but isn't an expected behavior.
                     Real world example: https://t.me/TelethonChat/271471
                     */
                    continue;
                }
                const cd = new dialog_1.Dialog(this.client, d, entities, message);
                if (!this.ignoreMigrated ||
                    (cd.entity != undefined && "migratedTo" in cd.entity)) {
                    this.buffer.push(cd);
                }
            }
        }
        if (r.dialogs.length < this.request.limit ||
            !(r instanceof tl_1.Api.messages.DialogsSlice)) {
            return true;
        }
        let lastMessage;
        for (let dialog of r.dialogs.reverse()) {
            lastMessage = messages.get(_dialogMessageKey(dialog.peer, dialog.topMessage));
            if (lastMessage) {
                break;
            }
        }
        this.request.excludePinned = true;
        this.request.offsetId = lastMessage ? lastMessage.id : 0;
        this.request.offsetDate = lastMessage ? lastMessage.date : 0;
        this.request.offsetPeer =
            (_a = this.buffer[this.buffer.length - 1]) === null || _a === void 0 ? void 0 : _a.inputEntity;
    }
}
exports._DialogsIter = _DialogsIter;
/** @hidden */
function iterDialogs(client, { limit = undefined, offsetDate = undefined, offsetId = 0, offsetPeer = new tl_1.Api.InputPeerEmpty(), ignorePinned = false, ignoreMigrated = false, folder = undefined, archived = undefined, }) {
    if (archived != undefined) {
        folder = archived ? 1 : 0;
    }
    return new _DialogsIter(client, limit, {}, {
        offsetDate,
        offsetId,
        offsetPeer,
        ignorePinned,
        ignoreMigrated,
        folder,
    });
}
exports.iterDialogs = iterDialogs;
/** @hidden */
async function getDialogs(client, params) {
    return (await client.iterDialogs(params).collect());
}
exports.getDialogs = getDialogs;
