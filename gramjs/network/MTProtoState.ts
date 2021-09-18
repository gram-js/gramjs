import bigInt from "big-integer";
import type { AuthKey } from "../crypto/AuthKey";
import { helpers } from "../";
import { Api } from "../tl";
import { sha256, toSignedLittleBuffer } from "../Helpers";
import { GZIPPacked, TLMessage } from "../tl/core";
import { BinaryReader } from "../extensions";
import type { BinaryWriter } from "../extensions";
import { IGE } from "../crypto/IGE";
import { InvalidBufferError, SecurityError } from "../errors";

export class MTProtoState {
    private readonly authKey?: AuthKey;
    private _log: any;
    timeOffset: number;
    salt: bigInt.BigInteger;
    private id: bigInt.BigInteger;
    _sequence: number;
    private _lastMsgId: bigInt.BigInteger;

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
    constructor(authKey?: AuthKey, loggers?: any) {
        this.authKey = authKey;
        this._log = loggers;
        this.timeOffset = 0;
        this.salt = bigInt.zero;
        this._sequence = 0;
        this.id = this._lastMsgId = bigInt.zero;
        this.reset();
    }

    /**
     * Resets the state
     */
    reset() {
        // Session IDs can be random on every connection
        this.id = helpers.generateRandomLong(true);
        this._sequence = 0;
        this._lastMsgId = bigInt.zero;
    }

    /**
     * Updates the message ID to a new one,
     * used when the time offset changed.
     * @param message
     */
    updateMessageId(message: any) {
        message.msgId = this._getNewMsgId();
    }

    /**
     * Calculate the key based on Telegram guidelines, specifying whether it's the client or not
     * @param authKey
     * @param msgKey
     * @param client
     * @returns {{iv: Buffer, key: Buffer}}
     */
    async _calcKey(authKey: Buffer, msgKey: Buffer, client: boolean) {
        const x = client ? 0 : 8;
        const [sha256a, sha256b] = await Promise.all([
            sha256(Buffer.concat([msgKey, authKey.slice(x, x + 36)])),
            sha256(Buffer.concat([authKey.slice(x + 40, x + 76), msgKey])),
        ]);
        const key = Buffer.concat([
            sha256a.slice(0, 8),
            sha256b.slice(8, 24),
            sha256a.slice(24, 32),
        ]);
        const iv = Buffer.concat([
            sha256b.slice(0, 8),
            sha256a.slice(8, 24),
            sha256b.slice(24, 32),
        ]);
        return { key, iv };
    }

    /**
     * Writes a message containing the given data into buffer.
     * Returns the message id.
     * @param buffer
     * @param data
     * @param contentRelated
     * @param afterId
     */
    async writeDataAsMessage(
        buffer: BinaryWriter,
        data: Buffer,
        contentRelated: boolean,
        afterId?: bigInt.BigInteger
    ) {
        const msgId = this._getNewMsgId();
        const seqNo = this._getSeqNo(contentRelated);
        let body;
        if (!afterId) {
            body = await GZIPPacked.gzipIfSmaller(contentRelated, data);
        } else {
            body = await GZIPPacked.gzipIfSmaller(
                contentRelated,
                new Api.InvokeAfterMsg({
                    msgId: afterId,
                    query: {
                        getBytes() {
                            return data;
                        },
                    },
                }).getBytes()
            );
        }
        const s = Buffer.alloc(4);
        s.writeInt32LE(seqNo, 0);
        const b = Buffer.alloc(4);
        b.writeInt32LE(body.length, 0);
        const m = toSignedLittleBuffer(msgId, 8);
        buffer.write(Buffer.concat([m, s, b]));
        buffer.write(body);
        return msgId;
    }

    /**
     * Encrypts the given message data using the current authorization key
     * following MTProto 2.0 guidelines core.telegram.org/mtproto/description.
     * @param data
     */
    async encryptMessageData(data: Buffer) {
        if (!this.authKey) {
            throw new Error("Auth key unset");
        }

        await this.authKey.waitForKey();
        const authKey = this.authKey.getKey();
        if (!authKey) {
            throw new Error("Auth key unset");
        }

        if (!this.salt || !this.id || !authKey || !this.authKey.keyId) {
            throw new Error("Unset params");
        }
        const s = toSignedLittleBuffer(this.salt, 8);
        const i = toSignedLittleBuffer(this.id, 8);
        data = Buffer.concat([Buffer.concat([s, i]), data]);
        const padding = helpers.generateRandomBytes(
            helpers.mod(-(data.length + 12), 16) + 12
        );
        // Being substr(what, offset, length); x = 0 for client
        // "msg_key_large = SHA256(substr(auth_key, 88+x, 32) + pt + padding)"
        const msgKeyLarge = await sha256(
            Buffer.concat([authKey.slice(88, 88 + 32), data, padding])
        );
        // "msg_key = substr (msg_key_large, 8, 16)"
        const msgKey = msgKeyLarge.slice(8, 24);

        const { iv, key } = await this._calcKey(authKey, msgKey, true);

        const keyId = helpers.readBufferFromBigInt(this.authKey.keyId, 8);
        return Buffer.concat([
            keyId,
            msgKey,
            new IGE(key, iv).encryptIge(Buffer.concat([data, padding])),
        ]);
    }

    /**
     * Inverse of `encrypt_message_data` for incoming server messages.
     * @param body
     */
    async decryptMessageData(body: Buffer) {
        if (!this.authKey) {
            throw new Error("Auth key unset");
        }

        if (body.length < 8) {
            throw new InvalidBufferError(body);
        }

        // TODO Check salt,sessionId, and sequenceNumber
        const keyId = helpers.readBigIntFromBuffer(body.slice(0, 8));
        if (!this.authKey.keyId || keyId.neq(this.authKey.keyId)) {
            throw new SecurityError("Server replied with an invalid auth key");
        }
        const authKey = this.authKey.getKey();
        if (!authKey) {
            throw new SecurityError("Unset AuthKey");
        }
        const msgKey = body.slice(8, 24);
        const { iv, key } = await this._calcKey(authKey, msgKey, false);
        body = new IGE(key, iv).decryptIge(body.slice(24));

        // https://core.telegram.org/mtproto/security_guidelines
        // Sections "checking sha256 hash" and "message length"

        const ourKey = await sha256(
            Buffer.concat([authKey.slice(96, 96 + 32), body])
        );

        if (!msgKey.equals(ourKey.slice(8, 24))) {
            throw new SecurityError(
                "Received msg_key doesn't match with expected one"
            );
        }

        const reader = new BinaryReader(body);
        reader.readLong(); // removeSalt
        const serverId = reader.readLong();
        if (serverId !== this.id) {
            // throw new SecurityError('Server replied with a wrong session ID');
        }

        const remoteMsgId = reader.readLong();
        const remoteSequence = reader.readInt();
        reader.readInt(); // msgLen for the inner object, padding ignored

        // We could read msg_len bytes and use those in a new reader to read
        // the next TLObject without including the padding, but since the
        // reader isn't used for anything else after this, it's unnecessary.
        const obj = reader.tgReadObject();

        return new TLMessage(remoteMsgId, remoteSequence, obj);
    }

    /**
     * Generates a new unique message ID based on the current
     * time (in ms) since epoch, applying a known time offset.
     * @private
     */
    _getNewMsgId() {
        const now = new Date().getTime() / 1000 + this.timeOffset;
        const nanoseconds = Math.floor((now - Math.floor(now)) * 1e9);
        let newMsgId = bigInt(Math.floor(now))
            .shiftLeft(bigInt(32))
            .or(bigInt(nanoseconds).shiftLeft(bigInt(2)));
        if (this._lastMsgId.greaterOrEquals(newMsgId)) {
            newMsgId = this._lastMsgId.add(bigInt(4));
        }
        this._lastMsgId = newMsgId;
        return newMsgId;
    }

    /**
     * Updates the time offset to the correct
     * one given a known valid message ID.
     * @param correctMsgId {BigInteger}
     */
    updateTimeOffset(correctMsgId: bigInt.BigInteger) {
        const bad = this._getNewMsgId();
        const old = this.timeOffset;
        const now = Math.floor(new Date().getTime() / 1000);
        const correct = correctMsgId.shiftRight(BigInt(32)).toJSNumber();
        this.timeOffset = correct - now;

        if (this.timeOffset !== old) {
            this._lastMsgId = bigInt.zero;
            this._log.debug(
                `Updated time offset (old offset ${old}, bad ${bad}, good ${correctMsgId}, new ${this.timeOffset})`
            );
        }

        return this.timeOffset;
    }

    /**
     * Generates the next sequence number depending on whether
     * it should be for a content-related query or not.
     * @param contentRelated
     * @private
     */
    _getSeqNo(contentRelated: boolean) {
        if (contentRelated) {
            const result = this._sequence * 2 + 1;
            this._sequence += 1;
            return result;
        } else {
            return this._sequence * 2;
        }
    }
}
