const {PromiseSocket, TimeoutError} = require("promise-socket");
const {Socket} = require("net");
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
        this.socket = new PromiseSocket(new Socket());

    }

    async _connect() {
        await this.socket.connect(this._port, this._ip);

        //await this.socket.connect({host: this._ip, port: this._port});
        this._codec = new this.packetCodec(this);
        this._initConn();
    }

    async connect() {
        await this._connect();
        this._connected = true;
        this._sendTask = this._sendLoop();
        this._recvTask = this._recvLoop();
    }

    async disconnect() {
        this._connected = false;
        this.socket.close();
    }

    async send(data) {
        if (!this._connected) {
            throw new Error("Not connected");
        }
        while (this._sendArray.length !== 0) {
            await Helpers.sleep(1000);
        }
        this._sendArray.push(data);
    }

    async recv() {
        while (this._connected) {

            while (this._recvArray.length === 0) {
                await Helpers.sleep(1000);
            }
            let result = this._recvArray.pop();

            if (result) { // null = sentinel value = keep trying
                return result
            }
        }
        throw new Error("Not connected");
    }

    async _sendLoop() {
        // TODO handle errors
        try {


            while (this._connected) {
                while (this._sendArray.length === 0) {
                    await Helpers.sleep(1000);
                }
                await this._send(this._sendArray.pop());

            }
        } catch (e) {
            console.log(e);
            this._log.info('The server closed the connection while sending')

        }
    }

    async _recvLoop() {
        let data;
        while (this._connected) {
            try {
                data = await this._recv();
            } catch (e) {
                console.log(e);
                this._log.info("The server closed the connection")
            }
            while (this._recvArray.length !== 0) {
                await Helpers.sleep(1000);
            }

            this._recvArray.push(data);
        }
    }

    async _initConn() {
        if (this._codec.tag) {
            await this.socket.write(this._codec.tag);
        }
    }

    async _send(data) {
        let encodedPacket = this._codec.encodePacket(data);
        await this.socket.write(encodedPacket);

    }

    async _recv() {
        return await this._codec.readPacket(this.socket);
    }

    toString() {
        return `${this._ip}:${this._port}/${this.constructor.name.replace("Connection", "")}`
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