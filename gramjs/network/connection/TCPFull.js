const {Connection, PacketCodec} = require("./Connection");
const struct = require("python-struct");
const {crc32} = require("crc");
const {InvalidChecksumError} = require("../../errors/Common");
const Socket = require("net").Socket;

class FullPacketCodec extends PacketCodec {
    constructor(connection) {
        super(connection);
        this._sendCounter = 0; // Telegram will ignore us otherwise
    }

    encodePacket(data) {
        // https://core.telegram.org/mtproto#tcp-transport
        // total length, sequence number, packet and checksum (CRC32)
        let length = data.length + 12;
        data = struct.pack('<ii', length, this._sendCounter) + data;
        let crc = struct.pack('<I', crc32(data));
        this._sendCounter += 1;
        return data + crc;
    }

    /**
     *
     * @param reader {Socket}
     * @returns {Promise<*>}
     */
    async readPacket(reader)
    {
        let packetLenSeq = await reader.read(8); // 4 and 4

        console.log("packet length", packetLenSeq);
        let res = struct.unpack("<ii", packetLenSeq);
        let packetLen = res[0];
        let seq = res[1];
        let body = await reader.read(packetLen - 8);
        let checksum = struct.unpack("<I", body.slice(-4))[0];

        let validChecksum = crc32(packetLen + body);
        if (!(validChecksum.equals(checksum))) {
            throw new InvalidChecksumError(checksum, validChecksum);
        }
        return body;
    }
}

class ConnectionTCPFull extends Connection {
    packetCodec = FullPacketCodec;
}

module.exports = {
    FullPacketCodec,
    ConnectionTCPFull
};