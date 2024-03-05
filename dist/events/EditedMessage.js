"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditedMessageEvent = exports.EditedMessage = void 0;
const tl_1 = require("../tl");
const NewMessage_1 = require("./NewMessage");
/**
 * Occurs whenever a text message or a message with media was edited.
 * @example
 * ```ts
 * async function editedEventPrint(event: EditedMessageEvent) {
 *   const message = event.message as Api.Message;
 *
 *   console.log(`Message ${message.id} from channel ${message.chatId!.toString();} was edited at ${message.editDate}`)
 * }
 * // adds an event handler for edited messages
 * client.addEventHandler(editedEventPrint, new EditedMessage({}));
 * ```
 */
class EditedMessage extends NewMessage_1.NewMessage {
    constructor(editedMessageParams) {
        super(editedMessageParams);
    }
    build(update, callback, selfId) {
        if (update instanceof tl_1.Api.UpdateEditChannelMessage ||
            update instanceof tl_1.Api.UpdateEditMessage) {
            if (!(update.message instanceof tl_1.Api.Message)) {
                return undefined;
            }
            const event = new EditedMessageEvent(update.message, update);
            this.addAttributes(event);
            return event;
        }
    }
}
exports.EditedMessage = EditedMessage;
class EditedMessageEvent extends NewMessage_1.NewMessageEvent {
    constructor(message, originalUpdate) {
        super(message, originalUpdate);
    }
}
exports.EditedMessageEvent = EditedMessageEvent;
