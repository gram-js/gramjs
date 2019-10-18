const { Connection, PacketCodec } = require('./Connection');
const struct = require('python-struct');
const { crc32 } = require('crc');
const { InvalidChecksumError } = require('../../errors/Common');

class FullPacketCodec extends PacketCodec {
    constructor(connection) {
        super(connection);
        this._sendCounter = 0; // Telegram will ignore us otherwise
    }

    encodePacket(data) {
        // https://core.telegram.org/mtproto#tcp-transport
        // total length, sequence number, packet and checksum (CRC32)
        const length = data.length + 12;
        data = Buffer.concat([struct.pack('<ii', length, this._sendCounter), data]);
        const crc = struct.pack('<I', crc32(data));
        this._sendCounter += 1;
        return Buffer.concat([data, crc]);
    }

    /**
     *
     * @param reader {Socket}
     * @returns {Promise<*>}
     */
    async readPacket(reader) {
        const packetLenSeq = await reader.read(8); // 4 and 4
        // process.exit(0);

        if (packetLenSeq === undefined) {
            console.log('connection closed. exiting');
            process.exit(0);
            throw new Error('closed connection');
        }

        const res = struct.unpack('<ii', packetLenSeq);
        const [packetLen] = res;
        let body = await reader.read(packetLen - 8);
        const [checksum] = struct.unpack('<I', body.slice(-4));
        body = body.slice(0, -4);

        const validChecksum = crc32(Buffer.concat([packetLenSeq, body]));
        if (!(validChecksum === checksum)) {
            throw new InvalidChecksumError(checksum, validChecksum);
        }
        return body;
    }
}

class ConnectionTCPFull extends Connection {
    PacketCodecClass = FullPacketCodec;
}

module.exports = {
    FullPacketCodec,
    ConnectionTCPFull,
};
