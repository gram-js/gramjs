import {
    Logger,
    PromisedNetSockets,
    PromisedWebSockets,
} from "../../extensions";
import { AsyncQueue } from "../../extensions";
import { AbridgedPacketCodec } from "./TCPAbridged";
import { FullPacketCodec } from "./TCPFull";
import { ProxyInterface } from "./TCPMTProxy";

interface ConnectionInterfaceParams {
    ip: string;
    port: number;
    dcId: number;
    loggers: Logger;
    proxy?: ProxyInterface;
    socket: PromisedNetSockets | PromisedWebSockets;
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
class Connection {
    PacketCodecClass?: typeof AbridgedPacketCodec | typeof FullPacketCodec;
    readonly _ip: string;
    readonly _port: number;
    _dcId: number;
    _log: Logger;
    _proxy?: ProxyInterface;
    private _connected: boolean;
    private _sendTask?: Promise<void>;
    private _recvTask?: Promise<void>;
    protected _codec: any;
    protected _obfuscation: any;
    private readonly _sendArray: AsyncQueue;
    private _recvArray: AsyncQueue;
    socket: PromisedNetSockets | PromisedWebSockets;
    public _testServers: boolean;

    constructor({
        ip,
        port,
        dcId,
        loggers,
        proxy,
        socket,
        testServers,
    }: ConnectionInterfaceParams) {
        this._ip = ip;
        this._port = port;
        this._dcId = dcId;
        this._log = loggers;
        this._proxy = proxy;
        this._connected = false;
        this._sendTask = undefined;
        this._recvTask = undefined;
        this._codec = undefined;
        this._obfuscation = undefined; // TcpObfuscated and MTProxy
        this._sendArray = new AsyncQueue();
        this._recvArray = new AsyncQueue();
        this.socket = socket;
        this._testServers = testServers;
    }

    async _connect() {
        this._log.debug("Connecting");
        this._codec = new this.PacketCodecClass!(this);
        await this.socket.connect(this._port, this._ip, this._testServers);
        this._log.debug("Finished connecting");
        // await this.socket.connect({host: this._ip, port: this._port});
        await this._initConn();
    }

    async connect() {
        await this._connect();
        this._connected = true;

        this._sendTask = this._sendLoop();
        this._recvTask = this._recvLoop();
    }

    async disconnect() {
        this._connected = false;
        await this._recvArray.push(undefined);
        await this.socket.close();
    }

    async send(data: Buffer) {
        if (!this._connected) {
            // this will stop the current loop
            await this._sendArray.push(undefined);
            throw new Error("Not connected");
        }
        await this._sendArray.push(data);
    }

    async recv() {
        while (this._connected) {
            const result = await this._recvArray.pop();
            // undefined = sentinel value = keep trying
            if (result && result.length) {
                return result;
            }
        }
        throw new Error("Not connected");
    }

    async _sendLoop() {
        // TODO handle errors
        try {
            while (this._connected) {
                const data = await this._sendArray.pop();
                if (!data) {
                    this._sendTask = undefined;
                    return;
                }
                await this._send(data);
            }
        } catch (e: any) {
            this._log.info("The server closed the connection while sending");
        }
    }

    async _recvLoop() {
        let data;
        while (this._connected) {
            try {
                data = await this._recv();
                if (!data) {
                    throw new Error("no data received");
                }
            } catch (e: any) {
                this._log.info("connection closed");
                //await this._recvArray.push()

                this.disconnect();
                return;
            }
            await this._recvArray.push(data);
        }
    }

    async _initConn() {
        if (this._codec.tag) {
            await this.socket.write(this._codec.tag);
        }
    }

    async _send(data: Buffer) {
        const encodedPacket = this._codec.encodePacket(data);
        this.socket.write(encodedPacket);
    }

    async _recv() {
        return await this._codec.readPacket(this.socket);
    }

    toString() {
        return `${this._ip}:${this._port}/${this.constructor.name.replace(
            "Connection",
            ""
        )}`;
    }
}

class ObfuscatedConnection extends Connection {
    ObfuscatedIO: any = undefined;

    async _initConn() {
        this._obfuscation = new this.ObfuscatedIO(this);
        await this._obfuscation.initHeader();
        this.socket.write(this._obfuscation.header);
    }

    async _send(data: Buffer) {
        this._obfuscation.write(this._codec.encodePacket(data));
    }

    async _recv() {
        return await this._codec.readPacket(this._obfuscation);
    }
}

class PacketCodec {
    private _conn: Buffer;

    constructor(connection: Buffer) {
        this._conn = connection;
    }

    encodePacket(data: Buffer) {
        throw new Error("Not Implemented");

        // Override
    }

    async readPacket(
        reader: PromisedNetSockets | PromisedWebSockets
    ): Promise<Buffer> {
        // override
        throw new Error("Not Implemented");
    }
}

export { Connection, PacketCodec, ObfuscatedConnection };
