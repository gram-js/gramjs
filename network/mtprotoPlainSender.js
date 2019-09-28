const Helpers = require("../utils/Helpers");

/**
 * MTProto Mobile Protocol plain sender (https://core.telegram.org/mtproto/description#unencrypted-messages)
 */
class MTProtoPlainSender {
    constructor(transport) {
        this._sequence = 0;
        this._timeOffset = 0;
        this._lastMsgId = 0;
        this._transport = transport;
    }

    /**
     * Sends a plain packet (auth_key_id = 0) containing the given message body (data)
     * @param data
     */
    send(data) {
        let packet = Buffer.alloc(8, 0);
        packet.writeBigInt64LE(this.getNewMsgId(), packet.byteLength);
        packet.writeInt32LE(data.length, packet.byteLength);
        packet.write(data, packet.byteLength);
        this._transport.send(packet);
    }

    /**
     * Receives a plain packet, returning the body of the response
     * @returns {Buffer}
     */
    receive() {
        let {seq, body} = this._transport.receive();
        let message_length = body.readInt32LE(16);
        return body.slice(20, message_length);

    }

    /**
     * Generates a new message ID based on the current time (in ms) since epoch
     * @returns {BigInt}
     */
    getNewMsgId() {
        //See https://core.telegram.org/mtproto/description#message-identifier-msg-id
        let msTime = Date.now();
        let newMsgId = ((BigInt(Math.floor(msTime / 1000)) << BigInt(32)) | // "must approximately equal unixtime*2^32"
            (BigInt(msTime % 1000) << BigInt(32)) | // "approximate moment in time the message was created"
            BigInt(Helpers.getRandomInt(0, 524288)) << BigInt(2));// "message identifiers are divisible by 4"
        //Ensure that we always return a message ID which is higher than the previous one
        if (this._lastMsgId >= newMsgId) {
            newMsgId = this._lastMsgId + 4
        }
        this._lastMsgId = newMsgId;
        return BigInt(newMsgId);

    }

}

module.exports = MTProtoPlainSender;
