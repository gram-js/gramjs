import { InvalidDCError, FloodError, BadRequestError } from "./RPCBaseErrors";
export declare class UserMigrateError extends InvalidDCError {
    newDc: number;
    constructor(args: any);
}
export declare class PhoneMigrateError extends InvalidDCError {
    newDc: number;
    constructor(args: any);
}
export declare class SlowModeWaitError extends FloodError {
    seconds: number;
    constructor(args: any);
}
export declare class FloodWaitError extends FloodError {
    seconds: number;
    constructor(args: any);
}
export declare class FloodTestPhoneWaitError extends FloodError {
    seconds: number;
    constructor(args: any);
}
export declare class FileMigrateError extends InvalidDCError {
    newDc: number;
    constructor(args: any);
}
export declare class NetworkMigrateError extends InvalidDCError {
    newDc: number;
    constructor(args: any);
}
export declare class EmailUnconfirmedError extends BadRequestError {
    codeLength: number;
    constructor(args: any);
}
export declare class MsgWaitError extends FloodError {
    constructor(args: any);
}
export declare const rpcErrorRe: Map<RegExp, any>;
