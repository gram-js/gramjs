/// <reference types="node" />
import { Logger, PromisedNetSockets, PromisedWebSockets } from "../../extensions";
import { AsyncQueue } from "../../extensions";
import { AbridgedPacketCodec } from "./TCPAbridged";
import { FullPacketCodec } from "./TCPFull";
import { ProxyInterface } from "./TCPMTProxy";
import { CancellablePromise } from "real-cancellable-promise";
interface ConnectionInterfaceParams {
    ip: string;
    port: number;
    dcId: number;
    loggers: Logger;
    proxy?: ProxyInterface;
    socket: typeof PromisedNetSockets | typeof PromisedWebSockets;
    testServers: boolean;
}
/**
 * The `Connection` class is a wrapper around ``asyncio.open_connection``.
 *
 * Subclasses will implement different transport modes as atomic operations,
 * which this class eases doing since the exposed interface simply puts and
 * gets complete data payloads to and from queues.
 *
 * The only error that will raise from send and receive methods is
 * ``ConnectionError``, which will raise when attempting to send if
 * the client is disconnected (includes remote disconnections).
 */
declare class Connection {
    PacketCodecClass?: typeof AbridgedPacketCodec | typeof FullPacketCodec;
    readonly _ip: string;
    readonly _port: number;
    _dcId: number;
    _log: Logger;
    _proxy?: ProxyInterface;
    _connected: boolean;
    private _sendTask?;
    private _recvTask?;
    protected _codec: any;
    protected _obfuscation: any;
    _sendArray: AsyncQueue;
    _recvArray: AsyncQueue;
    sendCancel?: CancellablePromise<any>;
    socket: PromisedNetSockets | PromisedWebSockets;
    _testServers: boolean;
    constructor({ ip, port, dcId, loggers, proxy, socket, testServers, }: ConnectionInterfaceParams);
    _connect(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    send(data: Buffer): Promise<void>;
    recv(): Promise<any>;
    _sendLoop(): Promise<void>;
    isConnected(): boolean;
    _recvLoop(): Promise<void>;
    _initConn(): Promise<void>;
    _send(data: Buffer): Promise<void>;
    _recv(): Promise<any>;
    toString(): string;
}
declare class ObfuscatedConnection extends Connection {
    ObfuscatedIO: any;
    _initConn(): Promise<void>;
    _send(data: Buffer): Promise<void>;
    _recv(): Promise<any>;
}
declare class PacketCodec {
    private _conn;
    constructor(connection: Buffer);
    encodePacket(data: Buffer): void;
    readPacket(reader: PromisedNetSockets | PromisedWebSockets): Promise<Buffer>;
}
export { Connection, PacketCodec, ObfuscatedConnection };
