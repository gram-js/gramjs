"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObfuscatedConnection = exports.PacketCodec = exports.Connection = void 0;
const extensions_1 = require("../../extensions");
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
    constructor({ ip, port, dcId, loggers, proxy, socket, testServers, }) {
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
        this._sendArray = new extensions_1.AsyncQueue();
        this._recvArray = new extensions_1.AsyncQueue();
        this.socket = new socket(proxy);
        this._testServers = testServers;
    }
    async _connect() {
        this._log.debug("Connecting");
        this._codec = new this.PacketCodecClass(this);
        await this.socket.connect(this._port, this._ip, this._testServers);
        this._log.debug("Finished connecting");
        // await this.socket.connect({host: this._ip, port: this._port});
        await this._initConn();
    }
    async connect() {
        await this._connect();
        this._connected = true;
        if (!this._sendTask) {
            this._sendTask = this._sendLoop();
        }
        this._recvTask = this._recvLoop();
    }
    async disconnect() {
        if (!this._connected) {
            return;
        }
        this._connected = false;
        void this._recvArray.push(undefined);
        await this.socket.close();
    }
    async send(data) {
        if (!this._connected) {
            throw new Error("Not connected");
        }
        await this._sendArray.push(data);
    }
    async recv() {
        while (this._connected) {
            const result = await this._recvArray.pop();
            // null = sentinel value = keep trying
            if (result) {
                return result;
            }
        }
        throw new Error("Not connected");
    }
    async _sendLoop() {
        try {
            while (this._connected) {
                const data = await this._sendArray.pop();
                if (!data) {
                    this._sendTask = undefined;
                    return;
                }
                await this._send(data);
            }
        }
        catch (e) {
            this._log.info("The server closed the connection while sending");
        }
    }
    isConnected() {
        return this._connected;
    }
    async _recvLoop() {
        let data;
        while (this._connected) {
            try {
                data = await this._recv();
                if (!data) {
                    throw new Error("no data received");
                }
            }
            catch (e) {
                this._log.info("connection closed");
                // await this._recvArray.push()
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
    async _send(data) {
        const encodedPacket = this._codec.encodePacket(data);
        this.socket.write(encodedPacket);
    }
    async _recv() {
        return await this._codec.readPacket(this.socket);
    }
    toString() {
        return `${this._ip}:${this._port}/${this.constructor.name.replace("Connection", "")}`;
    }
}
exports.Connection = Connection;
class ObfuscatedConnection extends Connection {
    constructor() {
        super(...arguments);
        this.ObfuscatedIO = undefined;
    }
    async _initConn() {
        this._obfuscation = new this.ObfuscatedIO(this);
        await this._obfuscation.initHeader();
        this.socket.write(this._obfuscation.header);
    }
    async _send(data) {
        this._obfuscation.write(this._codec.encodePacket(data));
    }
    async _recv() {
        return await this._codec.readPacket(this._obfuscation);
    }
}
exports.ObfuscatedConnection = ObfuscatedConnection;
class PacketCodec {
    constructor(connection) {
        this._conn = connection;
    }
    encodePacket(data) {
        throw new Error("Not Implemented");
        // Override
    }
    async readPacket(reader) {
        // override
        throw new Error("Not Implemented");
    }
}
exports.PacketCodec = PacketCodec;
