const { sha1, readBufferFromBigInt, readBigIntFromBuffer } = require('../Helpers')
const BinaryReader = require('../extensions/BinaryReader')
const { sleep } = require("../Helpers")

class AuthKey {
    constructor(data) {
        this.key = data
    }

    set key(value) {
        if (!value) {
            this._key = this.auxHash = this.keyId = null
            return
        }
        if (value instanceof AuthKey) {
            this._key = value._key
            this.auxHash = value.auxHash
            this.keyId = value.keyId
            return
        }
        this._key = value
        const reader = new BinaryReader(sha1(this._key))
        this.auxHash = reader.readLong(false)
        reader.read(4)
        this.keyId = reader.readLong(false)
    }

    async waitForKey() {
        while (!this.key) {
            await sleep(20)
        }
    }

    get key() {
        return this._key
    }

    // TODO : This doesn't really fit here, it's only used in authentication

    /**
     * Calculates the new nonce hash based on the current class fields' values
     * @param newNonce
     * @param number
     * @returns {bigint}
     */
    calcNewNonceHash(newNonce, number) {
        newNonce = readBufferFromBigInt(newNonce, 32, true, true)
        const n = Buffer.alloc(1)
        n.writeUInt8(number, 0)
        const data = Buffer.concat([newNonce,
            Buffer.concat([n, readBufferFromBigInt(this.auxHash, 8, true)])])

        // Calculates the message key from the given data
        const shaData = sha1(data).slice(4, 20)
        return readBigIntFromBuffer(shaData, true, true)
    }

    equals(other) {
        return other instanceof this.constructor && other.key === this._key
    }
}

module.exports = AuthKey
