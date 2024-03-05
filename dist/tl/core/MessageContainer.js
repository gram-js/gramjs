"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageContainer = void 0;
const TLMessage_1 = require("./TLMessage");
class MessageContainer {
    constructor(messages) {
        this.CONSTRUCTOR_ID = 0x73f1f8dc;
        this.messages = messages;
        this.classType = "constructor";
    }
    static async fromReader(reader) {
        const messages = [];
        const length = reader.readInt();
        for (let x = 0; x < length; x++) {
            const msgId = reader.readLong();
            const seqNo = reader.readInt();
            const length = reader.readInt();
            const before = reader.tellPosition();
            const obj = reader.tgReadObject();
            reader.setPosition(before + length);
            const tlMessage = new TLMessage_1.TLMessage(msgId, seqNo, obj);
            messages.push(tlMessage);
        }
        return new MessageContainer(messages);
    }
}
exports.MessageContainer = MessageContainer;
MessageContainer.CONSTRUCTOR_ID = 0x73f1f8dc;
MessageContainer.classType = "constructor";
// Maximum size in bytes for the inner payload of the container.
// Telegram will close the connection if the payload is bigger.
// The overhead of the container itself is subtracted.
MessageContainer.MAXIMUM_SIZE = 1044456 - 8;
// Maximum amount of messages that can't be sent inside a single
// container, inclusive. Beyond this limit Telegram will respond
// with BAD_MESSAGE 64 (invalid container).
//
// This limit is not 100% accurate and may in some cases be higher.
// However, sending up to 100 requests at once in a single container
// is a reasonable conservative value, since it could also depend on
// other factors like size per request, but we cannot know this.
MessageContainer.MAXIMUM_LENGTH = 100;
