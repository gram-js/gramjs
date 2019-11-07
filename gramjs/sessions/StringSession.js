const MemorySession = require('./Memory')
const AuthKey = require('../crypto/AuthKey')
const BinaryReader = require('../extensions/BinaryReader')
const CURRENT_VERSION = '1'


class StringSession extends MemorySession {
    /**
     * This session file can be easily saved and loaded as a string. According
     * to the initial design, it contains only the data that is necessary for
     * successful connection and authentication, so takeout ID is not stored.

     * It is thought to be used where you don't want to create any on-disk
     * files but would still like to be able to save and load existing sessions
     * by other means.

     * You can use custom `encode` and `decode` functions, if present:

     * `encode` definition must be ``function encode(value: Buffer) -> string:``.
     * `decode` definition must be ``function decode(value: string) -> Buffer:``.
     * @param session {string|null}
     */
    constructor(session = null) {
        super()
        if (session) {
            if (session[0] !== CURRENT_VERSION) {
                throw new Error('Not a valid string')
            }
            session = session.slice(1)
            const ipLen = session.length === 352 ? 4 : 16
            const r = StringSession.decode(session)
            const reader = new BinaryReader(r)
            this._dcId = reader.read(1).readUInt8(0)
            const ip = reader.read(ipLen)
            this._port = reader.read(2).readInt16BE(0)
            const key = reader.read(-1)
            this._serverAddress = ip.readUInt8(0) + '.' +
                ip.readUInt8(1) + '.' + ip.readUInt8(2) +
                '.' + ip.readUInt8(3)
            if (key) {
                this._authKey = new AuthKey(key)
            }
        }
    }

    /**
     * @param x {Buffer}
     * @returns {string}
     */
    static encode(x) {
        return x.toString('base64')
    }

    /**
     * @param x {string}
     * @returns {Buffer}
     */
    static decode(x) {
        return Buffer.from(x, 'base64')
    }

    save() {
        if (!this.authKey) {
            return ''
        }
        const ip = this.serverAddress.split('.')
        const dcBuffer = Buffer.from([this.dcId])
        const ipBuffer = Buffer.alloc(4)
        const portBuffer = Buffer.alloc(2)

        portBuffer.writeInt16BE(this.port, 0)
        for (let i = 0; i < ip.length; i++) {
            ipBuffer.writeUInt8(parseInt(ip[i]), i)
        }


        return CURRENT_VERSION + StringSession.encode(Buffer.concat([
            dcBuffer,
            ipBuffer,
            portBuffer,
            this.authKey.key,
        ]))
    }
}

module.exports = StringSession
