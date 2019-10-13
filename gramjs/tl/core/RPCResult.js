const {TLObject} = require("../tlobject");
const {RpcError} = require("../types")
const GZIPPacked = require("./GZIPPacked");

class RPCResult extends TLObject {
    static CONSTRUCTOR_ID = 0xf35c6d01;

    constructor(reqMsgId, body, error) {
        super();
        this.reqMsgId = reqMsgId;
        this.body = body;
        this.error = error;
    }

    static async fromReader(reader) {
        let msgId = reader.readInt();
        let innerCode = reader.readInt(false);
        if (innerCode === RpcError.CONSTRUCTOR_ID) {
            return RPCResult(msgId, null, RpcError.fromReader(reader));
        }
        if (innerCode === GZIPPacked.CONSTRUCTOR_ID) {
            return RPCResult(msgId, (await GZIPPacked.fromReader(reader)).data)
        }
        reader.seek(-4);
        // This reader.read() will read more than necessary, but it's okay.
        // We could make use of MessageContainer's length here, but since
        // it's not necessary we don't need to care about it.
        return new RPCResult(msgId, reader.read(), null)

    }

}

module.exports = RPCResult;