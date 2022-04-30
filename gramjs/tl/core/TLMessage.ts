import bigInt from "big-integer";
export class TLMessage {
    static SIZE_OVERHEAD = 12;
    static classType = "constructor";
    msgId: bigInt.BigInteger;
    private classType: string;
    private seqNo: number;
    obj: any;

    constructor(msgId: bigInt.BigInteger, seqNo: number, obj: any) {
        this.msgId = msgId;
        this.seqNo = seqNo;
        this.obj = obj;
        this.classType = "constructor";
    }
}
