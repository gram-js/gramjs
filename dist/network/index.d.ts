export { MTProtoPlainSender } from "./MTProtoPlainSender";
export { doAuthentication } from "./Authenticator";
export { MTProtoSender } from "./MTProtoSender";
export declare class UpdateConnectionState {
    static disconnected: number;
    static connected: number;
    static broken: number;
    state: number;
    constructor(state: number);
}
export { Connection, ConnectionTCPFull, ConnectionTCPAbridged, ConnectionTCPObfuscated, } from "./connection";
