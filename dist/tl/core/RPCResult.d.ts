/// <reference types="node" />
import { Api } from "../api";
import type { BinaryReader } from "../../extensions";
import bigInt from "big-integer";
export declare class RPCResult {
    static CONSTRUCTOR_ID: number;
    static classType: string;
    private CONSTRUCTOR_ID;
    private reqMsgId;
    private body?;
    private error?;
    private classType;
    constructor(reqMsgId: bigInt.BigInteger, body?: Buffer, error?: Api.RpcError);
    static fromReader(reader: BinaryReader): Promise<RPCResult>;
}
