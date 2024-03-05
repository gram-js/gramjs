/// <reference types="node" />
import { ObfuscatedConnection } from "./Connection";
import { AbridgedPacketCodec } from "./TCPAbridged";
declare class ObfuscatedIO {
    header?: Buffer;
    private connection;
    private _encrypt?;
    private _decrypt?;
    private _packetClass;
    constructor(connection: ConnectionTCPObfuscated);
    initHeader(): Promise<void>;
    read(n: number): Promise<Buffer>;
    write(data: Buffer): void;
}
export declare class ConnectionTCPObfuscated extends ObfuscatedConnection {
    ObfuscatedIO: typeof ObfuscatedIO;
    PacketCodecClass: typeof AbridgedPacketCodec;
}
export {};
