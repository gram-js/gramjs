"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeletedMessageEvent = exports.DeletedMessage = void 0;
const tl_1 = require("../tl");
const common_1 = require("./common");
/**
 * Occurs whenever a message is deleted. Note that this event isn't 100%
 * reliable, since Telegram doesn't always notify the clients that a message
 * was deleted.
 *
 * @remarks
 * Telegram **does not** send information about *where* a message
 * was deleted if it occurs in private conversations with other users
 * or in small group chats, because message IDs are *unique* and you
 * can identify the chat with the message ID alone if you saved it
 * previously.
 *
 * GramJS **does not** save information of where messages occur,
 * so it cannot know in which chat a message was deleted (this will
 * only work in channels, where the channel ID *is* present).
 *
 * This means that the `chats:` parameter will not work reliably,
 * unless you intend on working with channels and super-groups only.
 *
 * @example
 * ```ts
 * async function deletedMessageEventPrint(event: DeletedMessageEvent) {
 *
 *   for (let index = 0; index < update.deletedIds.length; index++) {
 *     const deletedMsgId = update.deletedIds[index];
 *     console.log(`Message ${deletedMsgId} was deleted.`)
 *   }
 *
 * }
 * // adds an event handler for deleted messages
 * client.addEventHandler(deletedMessageEventPrint, new DeletedMessage({}));
 * ```
 */
class DeletedMessage extends common_1.EventBuilder {
    constructor(eventParams) {
        super(eventParams);
    }
    build(update, callback, selfId) {
        if (update instanceof tl_1.Api.UpdateDeleteChannelMessages) {
            return new DeletedMessageEvent(update.messages, new tl_1.Api.PeerChannel({ channelId: update.channelId }));
        }
        else if (update instanceof tl_1.Api.UpdateDeleteMessages) {
            return new DeletedMessageEvent(update.messages);
        }
    }
}
exports.DeletedMessage = DeletedMessage;
class DeletedMessageEvent extends common_1.EventCommon {
    constructor(deletedIds, peer) {
        super({
            chatPeer: peer,
            msgId: Array.isArray(deletedIds) ? deletedIds[0] : 0,
        });
        this.deletedIds = deletedIds;
        this.peer = peer;
    }
}
exports.DeletedMessageEvent = DeletedMessageEvent;
