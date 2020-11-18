const { generateRandomBytes } = require('../../Helpers')
const { ObfuscatedConnection } = require('./Connection')
const { AbridgedPacketCodec } = require('./TCPAbridged')
const AESModeCTR = require('../../crypto/AESCTR')

class ObfuscatedIO {
    header = null

    constructor(connection) {
        this.connection = connection.socket
        const res = this.initHeader(connection.PacketCodecClass)
        this.header = res.random
        this._encrypt = res.encryptor
        this._decrypt = res.decryptor
    }

    initHeader(packetCodec) {
        // Obfuscated messages secrets cannot start with any of these
        const keywords = [Buffer.from('50567247', 'hex'), Buffer.from('474554', 'hex'),
            Buffer.from('504f5354', 'hex'), Buffer.from('eeeeeeee', 'hex')]
        let random

        // eslint-disable-next-line no-constant-condition
        while (true) {
            random = generateRandomBytes(64)
            if (random[0] !== 0xef && !(random.slice(4, 8).equals(Buffer.alloc(4)))) {
                let ok = true
                for (const key of keywords) {
                    if (key.equals(random.slice(0, 4))) {
                        ok = false
                        break
                    }
                }
                if (ok) {
                    break
                }
            }
        }
        random = random.toJSON().data
        const randomReversed = Buffer.from(random.slice(7, 55)).reverse()

        // Encryption has "continuous buffer" enabled
        const encryptKey = Buffer.from(random.slice(8, 40))
        const encryptIv = Buffer.from(random.slice(40, 56))
        const decryptKey = Buffer.from(randomReversed.slice(0, 32))
        const decryptIv = Buffer.from(randomReversed.slice(32, 48))
        const encryptor = new AESModeCTR(encryptKey, encryptIv)
        const decryptor = new AESModeCTR(decryptKey, decryptIv)
        random = Buffer.concat([
            Buffer.from(random.slice(0, 56)), packetCodec.obfuscateTag, Buffer.from(random.slice(60)),
        ])
        random = Buffer.concat([
            random.slice(0, 56), encryptor.encrypt(random).slice(56, 64), random.slice(64),
        ])
        return { random, encryptor, decryptor }
    }

    async read(n) {
        const data = await this.connection.read(n)
        return this._decrypt.encrypt(data)
    }

    write(data) {
        this.connection.send(this._encrypt.encrypt(data))
    }
}

class ConnectionTCPObfuscated extends ObfuscatedConnection {
    ObfuscatedIO = ObfuscatedIO
    PacketCodecClass = AbridgedPacketCodec
}

module.exports = {
    ConnectionTCPObfuscated,
}