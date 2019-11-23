/**
 *  This module contains the class used to communicate with Telegram's servers
 *  in plain text, when no authorization key has been created yet.
 */
const Helpers = require('../Helpers')
const MTProtoState = require('./MTProtoState')
const struct = require('python-struct')
const BinaryReader = require('../extensions/BinaryReader')
const { InvalidBufferError } = require('../errors/Common')

/**
 * MTProto Mobile Protocol plain sender (https://core.telegram.org/mtproto/description#unencrypted-messages)
 */

class MTProtoPlainSender {
    /**
     * Initializes the MTProto plain sender.
     * @param connection connection: the Connection to be used.
     * @param loggers
     */
    constructor(connection, loggers) {
        this._state = new MTProtoState(connection, loggers)
        this._connection = connection
    }

    /**
     * Sends and receives the result for the given request.
     * @param request
     */
    async send(request) {
        let body = request.getBytes()
        let msgId = this._state._getNewMsgId()
        const res = Buffer.concat([struct.pack('<qqi', [0, msgId.toString(), body.length]), body])

        await this._connection.send(res)
        body = await this._connection.recv()
        if (body.length < 8) {
            throw new InvalidBufferError(body)
        }
        const reader = new BinaryReader(body)
        const authKeyId = reader.readLong()
        if (authKeyId !== BigInt(0)) {
            throw new Error('Bad authKeyId')
        }
        msgId = reader.readLong()
        if (msgId === BigInt(0)) {
            throw new Error('Bad msgId')
        }
        /** ^ We should make sure that the read ``msg_id`` is greater
         * than our own ``msg_id``. However, under some circumstances
         * (bad system clock/working behind proxies) this seems to not
         * be the case, which would cause endless assertion errors.
         */

        const length = reader.readInt()
        if (length <= 0) {
            throw new Error('Bad length')
        }
        /**
         * We could read length bytes and use those in a new reader to read
         * the next TLObject without including the padding, but since the
         * reader isn't used for anything else after this, it's unnecessary.
         */
        return reader.tgReadObject()
    }

    /**
     * Generates a new message ID based on the current time (in ms) since epoch
     * @returns {BigInt}
     */
    getNewMsgId() {
        // See https://core.telegram.org/mtproto/description#message-identifier-msg-id
        const msTime = Date.now()
        let newMsgId =
            (BigInt(Math.floor(msTime / 1000)) << BigInt(32)) | // "must approximately equal unixtime*2^32"
            (BigInt(msTime % 1000) << BigInt(32)) | // "approximate moment in time the message was created"
            (BigInt(Helpers.getRandomInt(0, 524288)) << BigInt(2)) // "message identifiers are divisible by 4"
        // Ensure that we always return a message ID which is higher than the previous one
        if (this._lastMsgId >= newMsgId) {
            newMsgId = this._lastMsgId + BigInt(4)
        }
        this._lastMsgId = newMsgId
        return BigInt(newMsgId)
    }
}

module.exports = MTProtoPlainSender
