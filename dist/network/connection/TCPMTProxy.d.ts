/// <reference types="node" />
import { ObfuscatedConnection } from "./Connection";
import { AbridgedPacketCodec } from "./TCPAbridged";
import { Logger, PromisedNetSockets, PromisedWebSockets } from "../../extensions";
export interface ProxyInterface {
    socksType?: 4 | 5;
    ip: string;
    port: number;
    secret?: string;
    MTProxy?: boolean;
    timeout?: number;
    username?: string;
    password?: string;
}
declare class MTProxyIO {
    header?: Buffer;
    private connection;
    private _encrypt?;
    private _decrypt?;
    private _packetClass;
    private _secret;
    private _dcId;
    constructor(connection: TCPMTProxy);
    initHeader(): Promise<void>;
    read(n: number): Promise<Buffer>;
    write(data: Buffer): void;
}
interface TCPMTProxyInterfaceParams {
    ip: string;
    port: number;
    dcId: number;
    loggers: Logger;
    proxy: ProxyInterface;
    socket: typeof PromisedNetSockets | typeof PromisedWebSockets;
    testServers: boolean;
}
export declare class TCPMTProxy extends ObfuscatedConnection {
    ObfuscatedIO: typeof MTProxyIO;
    _secret: Buffer;
    constructor({ ip, port, dcId, loggers, proxy, socket, testServers, }: TCPMTProxyInterfaceParams);
}
export declare class ConnectionTCPMTProxyAbridged extends TCPMTProxy {
    PacketCodecClass: typeof AbridgedPacketCodec;
}
export {};
