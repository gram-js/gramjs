"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTProtoPlainSender = void 0;
/**
 *  This module contains the class used to communicate with Telegram's servers
 *  in plain text, when no authorization key has been created yet.
 */
const big_integer_1 = __importDefault(require("big-integer"));
const MTProtoState_1 = require("./MTProtoState");
const Helpers_1 = require("../Helpers");
const errors_1 = require("../errors");
const extensions_1 = require("../extensions");
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
        this._state = new MTProtoState_1.MTProtoState(undefined, loggers);
        this._connection = connection;
    }
    /**
     * Sends and receives the result for the given request.
     * @param request
     */
    async send(request) {
        let body = request.getBytes();
        let msgId = this._state._getNewMsgId();
        const m = (0, Helpers_1.toSignedLittleBuffer)(msgId, 8);
        const b = Buffer.alloc(4);
        b.writeInt32LE(body.length, 0);
        const res = Buffer.concat([
            Buffer.concat([Buffer.alloc(8), m, b]),
            body,
        ]);
        await this._connection.send(res);
        body = await this._connection.recv();
        if (body.length < 8) {
            throw new errors_1.InvalidBufferError(body);
        }
        const reader = new extensions_1.BinaryReader(body);
        const authKeyId = reader.readLong();
        if (authKeyId.neq((0, big_integer_1.default)(0))) {
            throw new Error("Bad authKeyId");
        }
        msgId = reader.readLong();
        if (msgId.eq((0, big_integer_1.default)(0))) {
            throw new Error("Bad msgId");
        }
        /** ^ We should make sure that the read ``msg_id`` is greater
         * than our own ``msg_id``. However, under some circumstances
         * (bad system clock/working behind proxies) this seems to not
         * be the case, which would cause endless assertion errors.
         */
        const length = reader.readInt();
        if (length <= 0) {
            throw new Error("Bad length");
        }
        /**
         * We could read length bytes and use those in a new reader to read
         * the next TLObject without including the padding, but since the
         * reader isn't used for anything else after this, it's unnecessary.
         */
        return reader.tgReadObject();
    }
}
exports.MTProtoPlainSender = MTProtoPlainSender;
