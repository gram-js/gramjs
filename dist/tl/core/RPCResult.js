"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPCResult = void 0;
const api_1 = require("../api");
const _1 = require("./");
class RPCResult {
    constructor(reqMsgId, body, error) {
        this.CONSTRUCTOR_ID = 0xf35c6d01;
        this.reqMsgId = reqMsgId;
        this.body = body;
        this.error = error;
        this.classType = "constructor";
    }
    static async fromReader(reader) {
        const msgId = reader.readLong();
        const innerCode = reader.readInt(false);
        if (innerCode === api_1.Api.RpcError.CONSTRUCTOR_ID) {
            return new RPCResult(msgId, undefined, api_1.Api.RpcError.fromReader(reader));
        }
        if (innerCode === _1.GZIPPacked.CONSTRUCTOR_ID) {
            return new RPCResult(msgId, (await _1.GZIPPacked.fromReader(reader)).data);
        }
        reader.seek(-4);
        // This reader.read() will read more than necessary, but it's okay.
        // We could make use of MessageContainer's length here, but since
        // it's not necessary we don't need to care about it.
        return new RPCResult(msgId, reader.read(), undefined);
    }
}
exports.RPCResult = RPCResult;
RPCResult.CONSTRUCTOR_ID = 0xf35c6d01;
RPCResult.classType = "constructor";
