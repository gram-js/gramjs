"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Forward = void 0;
const chatGetter_1 = require("./chatGetter");
const senderGetter_1 = require("./senderGetter");
const Helpers_1 = require("../../Helpers");
const Utils_1 = require("../../Utils");
const inspect_1 = require("../../inspect");
class Forward extends senderGetter_1.SenderGetter {
    constructor(client, original, entities) {
        super();
        // contains info for the original header sent by telegram.
        this.originalFwd = original;
        let senderId = undefined;
        let sender = undefined;
        let inputSender = undefined;
        let peer = undefined;
        let chat = undefined;
        let inputChat = undefined;
        if (original.fromId) {
            const ty = (0, Helpers_1._entityType)(original.fromId);
            if (ty === Helpers_1._EntityType.USER) {
                senderId = (0, Utils_1.getPeerId)(original.fromId);
                [sender, inputSender] = (0, Utils_1._getEntityPair)(senderId, entities, client._entityCache);
            }
            else if (ty === Helpers_1._EntityType.CHANNEL || ty === Helpers_1._EntityType.CHAT) {
                peer = original.fromId;
                [chat, inputChat] = (0, Utils_1._getEntityPair)((0, Utils_1.getPeerId)(peer), entities, client._entityCache);
            }
        }
        chatGetter_1.ChatGetter.initChatClass(this, {
            chatPeer: peer,
            inputChat: inputChat,
        });
        senderGetter_1.SenderGetter.initSenderClass(this, {
            senderId: senderId ? (0, Helpers_1.returnBigInt)(senderId) : undefined,
            sender: sender,
            inputSender: inputSender,
        });
        this._client = client;
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
}
exports.Forward = Forward;
