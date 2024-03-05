import bigInt from "big-integer";
export declare class TLMessage {
    static SIZE_OVERHEAD: number;
    static classType: string;
    msgId: bigInt.BigInteger;
    private classType;
    private seqNo;
    obj: any;
    constructor(msgId: bigInt.BigInteger, seqNo: number, obj: any);
}
