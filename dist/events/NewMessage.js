"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewMessageEvent = exports.NewMessage = void 0;
const common_1 = require("./common");
const tl_1 = require("../tl");
const Logger_1 = require("../extensions/Logger");
/**
 * Occurs whenever a new text message or a message with media arrives.
 * @example
 * ```ts
 * async function eventPrint(event: NewMessageEvent) {
 * const message = event.message;
 *
 *   // Checks if it's a private message (from user or bot)
 *   if (event.isPrivate){
 *       // prints sender id
 *       console.log(message.senderId);
 *       // read message
 *       if (message.text == "hello"){
 *           const sender = await message.getSender();
 *           console.log("sender is",sender);
 *           await client.sendMessage(sender,{
 *               message:`hi your id is ${message.senderId}`
 *           });
 *       }
 *   }
 * }
 * // adds an event handler for new messages
 * client.addEventHandler(eventPrint, new NewMessage({}));
 * ```
 */
class NewMessage extends common_1.EventBuilder {
    constructor(newMessageParams = {}) {
        let { chats, func, incoming, outgoing, fromUsers, forwards, pattern, blacklistChats = false, } = newMessageParams;
        if (incoming && outgoing) {
            incoming = outgoing = undefined;
        }
        else if (incoming != undefined && outgoing == undefined) {
            outgoing = !incoming;
        }
        else if (outgoing != undefined && incoming == undefined) {
            incoming = !outgoing;
        }
        else if (outgoing == false && incoming == false) {
            throw new Error("Don't create an event handler if you don't want neither incoming nor outgoing!");
        }
        super({ chats, blacklistChats, func });
        this.incoming = incoming;
        this.outgoing = outgoing;
        this.fromUsers = fromUsers;
        this.forwards = forwards;
        this.pattern = pattern;
        this._noCheck = [
            incoming,
            outgoing,
            chats,
            pattern,
            fromUsers,
            forwards,
            func,
        ].every((v) => v == undefined);
    }
    async _resolve(client) {
        await super._resolve(client);
        this.fromUsers = await (0, common_1._intoIdSet)(client, this.fromUsers);
    }
    build(update, callback, selfId) {
        if (update instanceof tl_1.Api.UpdateNewMessage ||
            update instanceof tl_1.Api.UpdateNewChannelMessage) {
            if (!(update.message instanceof tl_1.Api.Message)) {
                return undefined;
            }
            const event = new NewMessageEvent(update.message, update);
            this.addAttributes(event);
            return event;
        }
        else if (update instanceof tl_1.Api.UpdateShortMessage) {
            return new NewMessageEvent(new tl_1.Api.Message({
                out: update.out,
                mentioned: update.mentioned,
                mediaUnread: update.mediaUnread,
                silent: update.silent,
                id: update.id,
                peerId: new tl_1.Api.PeerUser({ userId: update.userId }),
                fromId: new tl_1.Api.PeerUser({
                    userId: update.out ? selfId : update.userId,
                }),
                message: update.message,
                date: update.date,
                fwdFrom: update.fwdFrom,
                viaBotId: update.viaBotId,
                replyTo: update.replyTo,
                entities: update.entities,
                ttlPeriod: update.ttlPeriod,
            }), update);
        }
        else if (update instanceof tl_1.Api.UpdateShortChatMessage) {
            return new NewMessageEvent(new tl_1.Api.Message({
                out: update.out,
                mentioned: update.mentioned,
                mediaUnread: update.mediaUnread,
                silent: update.silent,
                id: update.id,
                peerId: new tl_1.Api.PeerChat({ chatId: update.chatId }),
                fromId: new tl_1.Api.PeerUser({
                    userId: update.out ? selfId : update.fromId,
                }),
                message: update.message,
                date: update.date,
                fwdFrom: update.fwdFrom,
                viaBotId: update.viaBotId,
                replyTo: update.replyTo,
                entities: update.entities,
                ttlPeriod: update.ttlPeriod,
            }), update);
        }
    }
    filter(event) {
        var _a;
        if (this._noCheck) {
            return event;
        }
        if (this.incoming && event.message.out) {
            return;
        }
        if (this.outgoing && !event.message.out) {
            return;
        }
        if (this.forwards != undefined) {
            if (this.forwards != !!event.message.fwdFrom) {
                return;
            }
        }
        if (this.fromUsers != undefined) {
            if (!event.message.senderId ||
                !this.fromUsers.includes(event.message.senderId.toString())) {
                return;
            }
        }
        if (this.pattern) {
            const match = (_a = event.message.message) === null || _a === void 0 ? void 0 : _a.match(this.pattern);
            if (!match) {
                return;
            }
            event.message.patternMatch = match;
        }
        return super.filter(event);
    }
    addAttributes(update) {
        //update.patternMatch =
    }
}
exports.NewMessage = NewMessage;
class NewMessageEvent extends common_1.EventCommon {
    constructor(message, originalUpdate) {
        super({
            msgId: message.id,
            chatPeer: message.peerId,
            broadcast: message.post,
        });
        this.originalUpdate = originalUpdate;
        this.message = message;
    }
    _setClient(client) {
        super._setClient(client);
        const m = this.message;
        try {
            // todo make sure this never fails
            m._finishInit(client, this.originalUpdate._entities || new Map(), undefined);
        }
        catch (e) {
            client._log.error("Got error while trying to finish init message with id " + m.id);
            if (client._log.canSend(Logger_1.LogLevel.ERROR)) {
                console.error(e);
            }
        }
    }
}
exports.NewMessageEvent = NewMessageEvent;
