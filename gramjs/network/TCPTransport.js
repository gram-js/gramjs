const TcpClient = require("./TCPClient");
const crc = require('crc');

class TCPTransport {
    constructor(ipAddress, port) {
        this.tcpClient = new TcpClient();
        this.sendCounter = 0;
        this.ipAddress = ipAddress;
        this.port = port;

    }

    async connect() {


        await this.tcpClient.connect(this.ipAddress, this.port);
    }

    /**
     * Sends the given packet (bytes array) to the connected peer
     * Original reference: https://core.telegram.org/mtproto#tcp-transport
     * The packets are encoded as: total length, sequence number, packet and checksum (CRC32)
     * @param packet
     */
    async send(packet) {
        if (!this.tcpClient.connected) {
            throw Error("Client not connected to server.");
        }
        let buffer = Buffer.alloc(4 + 4);
        buffer.writeInt32LE(packet.length + 12, 0);
        buffer.writeInt32LE(this.sendCounter, 4);
        buffer = Buffer.concat([buffer, packet]);
        let tempBuffer = Buffer.alloc(4);
        tempBuffer.writeUInt32LE(crc.crc32(buffer), 0);
        buffer = Buffer.concat([buffer, tempBuffer]);
        await this.tcpClient.write(buffer);
        this.sendCounter++;
    }

    /**
     * Receives a TCP message (tuple(sequence number, body)) from the connected peer
     * @returns {{body: Buffer, seq: number}}
     */
    async receive() {
        /**First read everything we need**/
        let packetLengthBytes = await this.tcpClient.read(4);
        let packetLength = packetLengthBytes.readInt32LE(0);
        let seqBytes = await this.tcpClient.read(4);
        let seq = seqBytes.readInt32LE(0);
        let body = await this.tcpClient.read(packetLength - 12);
        let checksum = (await this.tcpClient.read(4)).readUInt32LE(0);
        /**Then perform the checks**/
        let rv = Buffer.concat([packetLengthBytes, seqBytes, body]);
        let validChecksum = crc.crc32(rv);
        if (checksum !== validChecksum) {
            throw Error("invalid checksum");
        }
        /** If we passed the tests, we can then return a valid TCP message**/

        return {seq, body}
    }

    async close() {
        if (this.tcpClient.connected) {
            await this.tcpClient.close();
        }
    }

    /**
     * Cancels (stops) trying to receive from the
     * remote peer and raises an {Error}
     */
    cancelReceive() {
        this.tcpClient.cancelRead();
    }

    /**
     * Gets the client read delay
     * @returns {number}
     */
    getClientDelay() {
        return this.tcpClient.delay;
    }


}

module.exports = TCPTransport;