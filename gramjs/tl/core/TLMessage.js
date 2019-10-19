const { TLObject } = require('../tlobject')

class TLMessage extends TLObject {
    static SIZE_OVERHEAD = 12;

    constructor(msgId, seqNo, obj) {
        super()
        this.msgId = msgId
        this.seqNo = seqNo
        this.obj = obj
    }
}

module.exports = TLMessage
