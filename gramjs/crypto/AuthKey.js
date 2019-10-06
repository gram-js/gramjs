const Helpers = require("../utils/Helpers");
const BinaryReader = require("../extensions/BinaryReader");

class AuthKey {
    constructor(data) {
        this.key = data;

    }

    set key(value) {
        if (!value) {
            this._key = this.auxHash = this.keyId = null;
            return
        }
        if (value instanceof this) {
            this._key = value._key;
            this.auxHash = value.auxHash;
            this.keyId = value.keyId;
            return
        }
        this._key = value;
        let reader = new BinaryReader(Helpers.sha1(this._key));
        this.auxHash = reader.readLong(false);
        reader.read(4);
        this.keyId = reader.readLong(false);
    }

    get key() {
        return this._key;
    }


    // TODO : This doesn't really fit here, it's only used in authentication
    /**
     * Calculates the new nonce hash based on the current class fields' values
     * @param new_nonce {Buffer}
     * @param number {number}
     * @returns {Buffer}
     */
    calcNewNonceHash(new_nonce, number) {
        let tempBuffer = Buffer.alloc(1);
        tempBuffer.writeInt8(number, 0);
        let secondBuffer = Buffer.alloc(8);
        secondBuffer.writeBigUInt64LE(this.auxHash, 0);
        let buffer = Buffer.concat([new_nonce, tempBuffer, secondBuffer]);
        return Helpers.calcMsgKey(buffer);
    }

    equals(other) {
        return (other instanceof this.constructor && other.key === this._key)
    }
}

module.exports = AuthKey;
