const {Connection, PacketCodec} = require("./Connection");
const struct = require("python-struct");
const {crc32} = require("crc");
const {InvalidChecksumError} = require("../../errors/Common");
const Socket = require("net").Socket;
const Helpers = require("../../utils/Helpers");

class FullPacketCodec extends PacketCodec {
    constructor(connection) {
        super(connection);
        this._sendCounter = 0; // Telegram will ignore us otherwise
    }

    encodePacket(data) {
        // https://core.telegram.org/mtproto#tcp-transport
        // total length, sequence number, packet and checksum (CRC32)
        let length = data.length + 12;
        data = Buffer.concat([struct.pack('<ii', length, this._sendCounter), data]);
        let crc = struct.pack('<I', crc32(data));
        this._sendCounter += 1;
        return Buffer.concat([data, crc]);
    }

    /**
     *
     * @param reader {Socket}
     * @returns {Promise<*>}
     */
    async readPacket(reader) {
        console.log("will read soon");
        let packetLenSeq = await reader.read(8); // 4 and 4
        //process.exit(0);

        if (packetLenSeq === undefined) {
            throw new Error("closed connection");
        }
        console.log("read packet length", packetLenSeq.toString("hex"));

        let res = struct.unpack("<ii", packetLenSeq);
        let packetLen = res[0];
        let seq = res[1];
        let body = await reader.read(packetLen - 8);
        console.log("body", body.toString("hex"));
        let checksum = struct.unpack("<I", body.slice(-4))[0];
        body = body.slice(0, -4);

        let validChecksum = crc32(Buffer.concat([packetLenSeq, body]));
        if (!(validChecksum === checksum)) {
            throw new InvalidChecksumError(checksum, validChecksum);
        }
        console.log("correct checksum");
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