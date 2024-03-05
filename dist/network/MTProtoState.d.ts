/// <reference types="node" />
import bigInt from "big-integer";
import type { AuthKey } from "../crypto/AuthKey";
import { TLMessage } from "../tl/core";
import type { BinaryWriter } from "../extensions";
export declare class MTProtoState {
    private readonly authKey?;
    private _log;
    timeOffset: number;
    salt: bigInt.BigInteger;
    private id;
    _sequence: number;
    private _lastMsgId;
    private msgIds;
    private securityChecks;
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
     * @param securityChecks
     */
    constructor(authKey?: AuthKey, loggers?: any, securityChecks?: boolean);
    /**
     * Resets the state
     */
    reset(): void;
    /**
     * Updates the message ID to a new one,
     * used when the time offset changed.
     * @param message
     */
    updateMessageId(message: any): void;
    /**
     * Calculate the key based on Telegram guidelines, specifying whether it's the client or not
     * @param authKey
     * @param msgKey
     * @param client
     * @returns {{iv: Buffer, key: Buffer}}
     */
    _calcKey(authKey: Buffer, msgKey: Buffer, client: boolean): Promise<{
        key: Buffer;
        iv: Buffer;
    }>;
    /**
     * Writes a message containing the given data into buffer.
     * Returns the message id.
     * @param buffer
     * @param data
     * @param contentRelated
     * @param afterId
     */
    writeDataAsMessage(buffer: BinaryWriter, data: Buffer, contentRelated: boolean, afterId?: bigInt.BigInteger): Promise<bigInt.BigInteger>;
    /**
     * Encrypts the given message data using the current authorization key
     * following MTProto 2.0 guidelines core.telegram.org/mtproto/description.
     * @param data
     */
    encryptMessageData(data: Buffer): Promise<Buffer>;
    /**
     * Inverse of `encrypt_message_data` for incoming server messages.
     * @param body
     */
    decryptMessageData(body: Buffer): Promise<TLMessage>;
    /**
     * Generates a new unique message ID based on the current
     * time (in ms) since epoch, applying a known time offset.
     * @private
     */
    _getNewMsgId(): bigInt.BigInteger;
    /**
     * Updates the time offset to the correct
     * one given a known valid message ID.
     * @param correctMsgId {BigInteger}
     */
    updateTimeOffset(correctMsgId: bigInt.BigInteger): number;
    /**
     * Generates the next sequence number depending on whether
     * it should be for a content-related query or not.
     * @param contentRelated
     * @private
     */
    _getSeqNo(contentRelated: boolean): number;
}
