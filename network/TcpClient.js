const Socket = require("net").Socket;
const sleep = require("../utils/Helpers").sleep;

class TcpClient {
    constructor() {
        this.connected = false;
        this.socket = new Socket();
        this.canceled = false;
        this.delay = 100;
    }

    /**
     * Connects to the specified IP and port number
     * @param ip
     * @param port
     */
    async connect(ip, port) {
        this.socket.connect({host: ip, port: port});
        this.connected = true;

    }

    /**
     * Closes the connection
     */
    async close() {
        this.socket.destroy();
        this.connected = true;
    }

    /**
     * Writes (sends) the specified bytes to the connected peer
     * @param data
     */
    async write(data) {
        this.socket.write(data);
    }

    /**
     * Reads (receives) the specified bytes from the connected peer
     * @param bufferSize
     * @returns {Buffer}
     */
    async read(bufferSize) {
        this.canceled = false;
        let buffer = Buffer.alloc(0);

        let writtenCount = 0;
        while (writtenCount < bufferSize) {
            let leftCount = bufferSize - writtenCount;
            let partial = this.socket.read(leftCount);
            if (partial == null) {
                await sleep(this.delay);
                continue;
            }
            buffer = Buffer.concat([buffer, partial]);
            writtenCount += buffer.byteLength;
        }

        return buffer;
    }

    /**
     * Cancels the read operation IF it hasn't yet
     * started, raising a ReadCancelledError
     */
    cancelRead() {
        this.canceled = true;
    }

}

module.exports = TcpClient;
