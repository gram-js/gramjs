"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TLMessage = void 0;
class TLMessage {
    constructor(msgId, seqNo, obj) {
        this.msgId = msgId;
        this.seqNo = seqNo;
        this.obj = obj;
        this.classType = "constructor";
    }
}
exports.TLMessage = TLMessage;
TLMessage.SIZE_OVERHEAD = 12;
TLMessage.classType = "constructor";
