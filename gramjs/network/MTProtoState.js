const struct = require("python-struct");
const Helpers = require("../utils/Helpers");
const AES = require("../crypto/AES");
const BinaryReader = require("../extensions/BinaryReader");

class MTProtoState {
    /**
     *
     `telethon.network.mtprotosender.MTProtoSender` needs to hold a state
     in order to be able to encrypt and decrypt incoming/outgoing messages,
     as well as generating the message IDs. Instances of this class hold
     together all the required information.

     It doesn't make sense to use `telethon.sessions.abstract.Session` for
     the sender because the sender should *not* be concerned about storing
     this information to disk, as one may create as many senders as they
     desire to any other data center, or some CDN. Using the same session
     for all these is not a good idea as each need their own authkey, and
     the concept of "copying" sessions with the unnecessary entities or
     updates state for these connections doesn't make sense.

     While it would be possible to have a `MTProtoPlainState` that does no
     encryption so that it was usable through the `MTProtoLayer` and thus
     avoid the need for a `MTProtoPlainSender`, the `MTProtoLayer` is more
     focused to efficiency and this state is also more advanced (since it
     supports gzipping and invoking after other message IDs). There are too
     many methods that would be needed to make it convenient to use for the
     authentication process, at which point the `MTProtoPlainSender` is better
     * @param authKey
     * @param loggers
     */
    constructor(authKey, loggers) {
        this.authKey = authKey;
        this._log = loggers;
        this.timeOffset = 0;
        this.salt = 0;

        this.id = this._sequence = this._lastMsgId = null;
        this.reset();
    }

    /**
     * Resets the state
     */
    reset() {
        // Session IDs can be random on every connection
        this.id = Helpers.generateRandomLong(true);
        this._sequence = 0;
        this._lastMsgId = 0;
    }

    /**
     * Updates the message ID to a new one,
     * used when the time offset changed.
     * @param message
     */
    updateMessageId(message) {
        message.msgId = this._getNewMsgId();
    }

    /**
     * Calculate the key based on Telegram guidelines, specifying whether it's the client or not
     * @param authKey
     * @param msgKey
     * @param client
     * @returns {{iv: Buffer, key: Buffer}}
     */
    _calcKey(authKey, msgKey, client) {
        let x = client === true ? 0 : 8;
        let sha256a = Helpers.sha256(Buffer.concat([
            msgKey,
            authKey.slice(x, (x + 36))
        ]));
        let sha256b = Helpers.sha256(Buffer.concat([
            authKey.slice(x + 40, x + 76),
            msgKey,
        ]));

        let key = Buffer.concat([
            sha256a.slice(0, 8),
            sha256b.slice(8, 24),
            sha256a.slice(24, 32)]);
        let iv = Buffer.concat([
            sha256b.slice(0, 8),
            sha256a.slice(8, 24),
            sha256b.slice(24, 32)]);
        return {key, iv}

    }

    /**
     * Writes a message containing the given data into buffer.
     * Returns the message id.
     * @param buffer
     * @param data
     * @param contentRelated
     * @param opt
     */
    writeDataAsMessage(buffer, data, contentRelated, opt = {}) {
        let msgId = this._getNewMsgId();
        let seqNo = this._getSeqNo(contentRelated);
        let body;
        if (!opt) {
            body = GzipPacked.gzipIfSmaller(contentRelated, data);
        } else {
            body = GzipPacked.gzipIfSmaller(contentRelated,
                new InvokeAfterMsgRequest(opt.afterId, data).toBuffer()
            );
        }

        buffer = Buffer.from([
            buffer,
            struct.pack('<qii', msgId, seqNo, body.length),
            body,
        ]);
        return {msgId, buffer}
    }

    /**
     * Encrypts the given message data using the current authorization key
     * following MTProto 2.0 guidelines core.telegram.org/mtproto/description.
     * @param data
     */
    encryptMessageData(data) {
        data = Buffer.concat([
            struct.pack('<qq', this.salt, this.id),
            data,
        ]);
        let padding = Helpers.generateRandomBytes(-(data.length + 12) % 16 + 12);
        // Being substr(what, offset, length); x = 0 for client
        // "msg_key_large = SHA256(substr(auth_key, 88+x, 32) + pt + padding)"
        let msgKeyLarge = Helpers.sha256(
            Buffer.concat(([
                this.authKey.key.slice(88, 88 + 32),
                data,
                padding
            ]))
        );
        // "msg_key = substr (msg_key_large, 8, 16)"
        let msgKey = msgKeyLarge.slice(8, 24);
        let {iv, key} = this._calcKey(this.authKey.key, msgKey, true);
        let keyId = struct.pack('<Q', this.authKey.keyId);
        return Buffer.concat([
            keyId,
            msgKey,
            AES.encryptIge(Buffer.concat([
                    data,
                    padding
                ]),
                key,
                iv)
        ]);

    }

    /**
     * Inverse of `encrypt_message_data` for incoming server messages.
     * @param body
     */
    decryptMessageData(body) {
        if (body.length < 8) {
            throw InvalidBufferError(body);
        }

        // TODO Check salt,sessionId, and sequenceNumber
        let keyId = struct.unpack('<Q', body.slice(0, 8))[0];
        if (keyId !== this.authKey.keyId) {
            throw new SecurityError('Server replied with an invalid auth key');
        }

        let msgKey = body.slice(8, 24);
        let {iv, key} = this._calcKey(this.authKey.key, msgKey, false);
        body = AES.decryptIge(body.slice(24), key, iv);

        // https://core.telegram.org/mtproto/security_guidelines
        // Sections "checking sha256 hash" and "message length"

        let ourKey = Helpers.sha256(Buffer.concat([
            this.authKey.key.slice(96, 96 + 32),
            body
        ]));
        if (msgKey !== ourKey.slice(8, 24)) {
            throw new SecurityError(
                "Received msg_key doesn't match with expected one")
        }

        let reader = new BinaryReader(body);
        reader.readLong(); // removeSalt
        if (reader.readLong() !== this.id) {
            throw new SecurityError('Server replied with a wrong session ID');
        }

        let remoteMsgId = reader.readLong();
        let remoteSequence = reader.readInt();
        reader.readInt(); // msgLen for the inner object, padding ignored

        // We could read msg_len bytes and use those in a new reader to read
        // the next TLObject without including the padding, but since the
        // reader isn't used for anything else after this, it's unnecessary.
        let obj = reader.tgReadObject();

        return new TLMessage(remoteMsgId, remoteSequence, obj);

    }

    /**
     * Generates a new unique message ID based on the current
     * time (in ms) since epoch, applying a known time offset.
     * @private
     */
    _getNewMsgId() {

        let now = new Date().getTime() / 1000 + this.timeOffset;
        let nanoseconds = Math.floor((now - Math.floor(now)) * 1e+9);
        let newMsgId = (BigInt(Math.floor(now)) << 32n) | (BigInt(nanoseconds) << 2n);
        if (this._lastMsgId >= newMsgId) {
            newMsgId = this._lastMsgId + 4n;
        }
        this._lastMsgId = newMsgId;
        return newMsgId;
    }

    /**
     * Updates the time offset to the correct
     * one given a known valid message ID.
     * @param correctMsgId
     */
    updateTimeOffset(correctMsgId) {
        let bad = this._getNewMsgId();
        let old = this.timeOffset;
        let now = Math.floor(new Date().getTime() / 1000);
        let correct = correctMsgId >> 32n;
        this.timeOffset = correct - now;

        if (this.timeOffset !== old) {
            this._lastMsgId = 0;
            this._log.debug(
                `Updated time offset (old offset ${old}, bad ${bad}, good ${correctMsgId}, new ${this.timeOffset})`,
            )
        }

        return this.timeOffset;
    }

    /**
     * Generates the next sequence number depending on whether
     * it should be for a content-related query or not.
     * @param contentRelated
     * @private
     */
    _getSeqNo(contentRelated) {
        if (contentRelated) {
            let result = this._sequence * 2 + 1;
            this._sequence += 1;
            return result;
        } else {
            return this._sequence * 2;
        }
    }

}


module.exports = MTProtoState;