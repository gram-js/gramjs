const Socket = require("net").Socket;
const Helpers = require("../../utils/Helpers");

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
    packetCodec = null;

    constructor(ip, port, dcId, loggers) {
        this._ip = ip;
        this._port = port;
        this._dcId = dcId;
        this._log = loggers;
        this._reader = null;
        this._writer = null;
        this._connected = false;
        this._sendTask = null;
        this._recvTask = null;
        this._codec = null;
        this._obfuscation = null;  // TcpObfuscated and MTProxy
        this._sendArray = [];
        this._recvArray = [];
        this.socket = new Socket();

    }

    async _connect() {
        console.log("trying to connect sock");
        console.log("ip is ", this._ip);
        console.log("port is ", this._port);
        await this.socket.connect({host: this._ip, port: this._port});
        this._codec = new this.packetCodec(this);
        this._initConn();
        console.log("finished init");
    }

    async connect() {
        console.log("TCP connecting");
        await this._connect();
        this._connected = true;
        console.log("finished first connect");
        this._sendTask = this._sendLoop();
        this._recvTask = this._recvLoop();
        console.log("finsihed TCP connecting");
    }

    async disconnect() {
        this._connected = false;
        this.socket.close();
    }

    async send(data) {
        console.log(this._sendArray);
        if (!this._connected) {
            throw new Error("Not connected");
        }
        while (this._sendArray.length !== 0) {
            await Helpers.sleep(100);
        }
        console.log("will send",data);
        this._sendArray.push(data);
    }

    async recv() {
        while (this._connected) {
            while (this._recvArray.length === 0) {
                await Helpers.sleep(100);
            }
            let result = await this._recvArray.pop();

            if (result) { // null = sentinel value = keep trying
                return result
            }
        }
        throw new Error("Not connected");
    }

    async _sendLoop() {
        // TODO handle errors
        while (this._connected) {
            while (this._sendArray.length === 0) {
                console.log("sleeping");
                await Helpers.sleep(1000);
            }
            await this._send(this._sendArray.pop());

        }
    }

    async _recvLoop() {
        while (this._connected) {

            while (this._recvArray.length === 0) {
                await Helpers.sleep(1000);
            }
            let data = await this._recv();

            this._recvArray.push(data);
        }
    }

    async _initConn() {
        if (this._codec.tag) {
            console.log("writing codec");
            this.socket.write(this._codec.tag);
        }
    }

    async _send(data) {
        console.log("sending ", data);
        await this.socket.write(this._codec.encodePacket(data));
    }

    async _recv() {
        console.log("receiving");
        return await this._codec.readPacket(this.socket);
    }
}

class PacketCodec {
    constructor(connection) {
        this._conn = connection;
    }

    encodePacket(data) {
        throw new Error("Not Implemented")

        //Override
    }

    async readPacket(reader) {
        //override
        throw new Error("Not Implemented")
    }
}

module.exports = {
    Connection,
    PacketCodec
};