const { PromiseSocket } = require('promise-socket')
const { Socket } = require('net')
const AsyncQueue = require('../../extensions/AsyncQueue')

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
    PacketCodecClass = null

    constructor(ip, port, dcId, loggers) {
        this._ip = ip
        this._port = port
        this._dcId = dcId
        this._log = loggers
        this._reader = null
        this._writer = null
        this._connected = false
        this._sendTask = null
        this._recvTask = null
        this._codec = null
        this._obfuscation = null // TcpObfuscated and MTProxy
        this._sendArray = new AsyncQueue()
        this._recvArray = new AsyncQueue()
        this.socket = new PromiseSocket(new Socket())
    }

    async _connect() {
        await this.socket.connect(this._port, this._ip)

        // await this.socket.connect({host: this._ip, port: this._port});
        this._codec = new this.PacketCodecClass(this)
        this._initConn()
    }

    async connect() {
        await this._connect()
        this._connected = true
        this._sendTask = this._sendLoop()
        this._recvTask = this._recvLoop()
    }

    async disconnect() {
        this._connected = false
        await this.socket.end()
    }

    async send(data) {
        if (!this._connected) {
            throw new Error('Not connected')
        }
        await this._sendArray.push(data)
    }

    async recv() {
        while (this._connected) {
            const result = await this._recvArray.pop()

            // null = sentinel value = keep trying
            if (result) {
                return result
            }
        }
        throw new Error('Not connected')
    }

    async _sendLoop() {
        // TODO handle errors
        try {
            while (this._connected) {
                await this._send(await this._sendArray.pop())
            }
        } catch (e) {
            console.log(e)
            this._log.info('The server closed the connection while sending')
        }
    }

    async _recvLoop() {
        let data
        while (this._connected) {
            try {
                data = await this._recv()
                if (!data) {
                    return
                }
            } catch (e) {
                console.log(e)
                this._log.info('an error occured')
            }
            await this._recvArray.push(data)
        }
    }

    async _initConn() {
        if (this._codec.tag) {
            await this.socket.write(this._codec.tag)
        }
    }

    async _send(data) {
        const encodedPacket = this._codec.encodePacket(data)
        await this.socket.write(encodedPacket)
    }

    async _recv() {
        return await this._codec.readPacket(this.socket)
    }

    toString() {
        return `${this._ip}:${this._port}/${this.constructor.name.replace('Connection', '')}`
    }
}

class PacketCodec {
    constructor(connection) {
        this._conn = connection
    }

    encodePacket(data) {
        throw new Error('Not Implemented')

        // Override
    }

    async readPacket(reader) {
        // override
        throw new Error('Not Implemented')
    }
}

module.exports = {
    Connection,
    PacketCodec,
}
