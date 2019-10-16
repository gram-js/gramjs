const {TLObject} = require("../tlobject");
const struct = require("python-struct");
const TLMessage = require("./TLMessage");
console.log("tl message is ", TLMessage);

class MessageContainer extends TLObject {
    static CONSTRUCTOR_ID = 0x73f1f8dc;

    // Maximum size in bytes for the inner payload of the container.
    // Telegram will close the connection if the payload is bigger.
    // The overhead of the container itself is subtracted.
    static MAXIMUM_SIZE = 1044456 - 8;

    // Maximum amount of messages that can't be sent inside a single
    // container, inclusive. Beyond this limit Telegram will respond
    // with BAD_MESSAGE 64 (invalid container).
    //
    // This limit is not 100% accurate and may in some cases be higher.
    // However, sending up to 100 requests at once in a single container
    // is a reasonable conservative value, since it could also depend on
    // other factors like size per request, but we cannot know this.
    static MAXIMUM_LENGTH = 100;

    constructor(messages) {
        super();
        this.CONSTRUCTOR_ID = 0x73f1f8dc;
        this.messages = messages;
    }

    static async fromReader(reader) {
        let messages = [];
        let length = reader.readInt();
        for (let x = 0; x < length; x++) {
            let msgId = reader.readLong();
            let seqNo = reader.readInt();
            let length = reader.readInt();
            let before = reader.tellPosition();
            let obj = reader.tgReadObject();
            reader.setPosition(before + length);
            let tlMessage = new TLMessage(msgId, seqNo, obj);
            messages.push(tlMessage)
        }
        return new MessageContainer(messages);
    }

}

module.exports = MessageContainer;