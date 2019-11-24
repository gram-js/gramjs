const struct = require('python-struct')
const { readBufferFromBigInt } = require('../../Helpers')
const { Connection, PacketCodec } = require('./Connection')
const BigInt = require('big-integer')

class AbridgedPacketCodec extends PacketCodec {
    static tag = Buffer.from('ef', 'hex')
    static obfuscateTag = Buffer.from('efefefef', 'hex')

    constructor(props) {
        super(props)
        this.tag = AbridgedPacketCodec.tag
        this.obfuscateTag = AbridgedPacketCodec.obfuscateTag
    }

    encodePacket(data) {
        let length = data.length >> 2
        if (length < 127) {
            length = struct.pack('B', length)
        } else {
            length = Buffer.concat([Buffer.from('7f', 'hex'), readBufferFromBigInt(BigInt(length), 3)])
        }
        return Buffer.concat([length, data])
    }

    async readPacket(reader) {
        const readData = await reader.read(1)
        let length = struct.unpack('<B', readData)[0]
        if (length >= 127) {
            length = struct.unpack(
                '<i', Buffer.concat([await reader.read(3), Buffer.alloc(1)]))[0]
        }

        return await reader.read(length << 2)
    }
}

/**
 * This is the mode with the lowest overhead, as it will
 * only require 1 byte if the packet length is less than
 * 508 bytes (127 << 2, which is very common).
 */
class ConnectionTCPAbridged extends Connection {
    packetCode = AbridgedPacketCodec
}

module.exports = {
    ConnectionTCPAbridged,
    AbridgedPacketCodec,
}
