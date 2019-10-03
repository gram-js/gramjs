const Helpers = require("../utils/Helpers");

class AuthKey {
    constructor(data) {
        this.key = data;
        let offset = 0;
        let buffer = Helpers.sha1(data);
        this.auxHash = buffer.readBigUInt64LE(offset);
        offset = 8 + 4;
        this.keyId = buffer.readBigUInt64LE(offset);

    }

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

}

module.exports = AuthKey;
