import { Connection, PacketCodec } from "./Connection";
import { crc32 } from "../../Helpers";
import { InvalidBufferError, InvalidChecksumError } from "../../errors";
import type { PromisedNetSockets, PromisedWebSockets } from "../../extensions";

export class FullPacketCodec extends PacketCodec {
    private _sendCounter: number;

    constructor(connection: any) {
        super(connection);
        this._sendCounter = 0; // Telegram will ignore us otherwise
    }

    encodePacket(data: Buffer) {
        // https://core.telegram.org/mtproto#tcp-transport
        // total length, sequence number, packet and checksum (CRC32)
        const length = data.length + 12;
        const e = Buffer.alloc(8);
        e.writeInt32LE(length, 0);
        e.writeInt32LE(this._sendCounter, 4);
        data = Buffer.concat([e, data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32LE(crc32(data), 0);
        this._sendCounter += 1;
        return Buffer.concat([data, crc]);
    }

    /**
     *
     * @param reader {PromisedWebSockets}
     * @returns {Promise<*>}
     */
    async readPacket(
        reader: PromisedNetSockets | PromisedWebSockets
    ): Promise<Buffer> {
        const packetLenSeq = await reader.readExactly(8); // 4 and 4

        if (packetLenSeq === undefined) {
            // Return empty buffer in case of issue
            return Buffer.alloc(0);
        }
        const packetLen = packetLenSeq.readInt32LE(0);
        if (packetLen < 0) {
            // # It has been observed that the length and seq can be -429,
            // # followed by the body of 4 bytes also being -429.
            // # See https://github.com/LonamiWebs/Telethon/issues/4042.
            const body = await reader.readExactly(4);
            throw new InvalidBufferError(body);
        }
        let body = await reader.readExactly(packetLen - 8);
        const checksum = body.slice(-4).readUInt32LE(0);
        body = body.slice(0, -4);

        const validChecksum = crc32(Buffer.concat([packetLenSeq, body]));
        if (!(validChecksum === checksum)) {
            throw new InvalidChecksumError(checksum, validChecksum);
        }
        return body;
    }
}

export class ConnectionTCPFull extends Connection {
    PacketCodecClass = FullPacketCodec;
}
