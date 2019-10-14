const Helpers = require("../utils/Helpers");
const BinaryReader = require("../extensions/BinaryReader");
const struct = require("python-struct");
const bigUintLE  =require("biguintle");
class AuthKey {
    constructor(data) {
        this.key = data;

    }

    set key(value) {
        if (!value) {
            this._key = this.auxHash = this.keyId = null;
            return
        }
        if (value instanceof AuthKey) {
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
     * @param new_nonce
     * @param number
     * @returns {bigint}
     */
    calcNewNonceHash(new_nonce, number) {

        new_nonce = Helpers.readBufferFromBigInt(new_nonce, 32);
        let data = Buffer.concat([
            new_nonce,
            struct.pack("<BQ", number.toString(), this.auxHash.toString())
        ]);

        //Calculates the message key from the given data
        let shaData = Helpers.sha1(data).slice(4, 20);
        return Helpers.readBigIntFromBuffer(shaData);
    }

    equals(other) {
        return (other instanceof this.constructor && other.key === this._key)
    }

}

module.exports = AuthKey;
