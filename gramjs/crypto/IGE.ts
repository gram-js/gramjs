const Helpers = require("../Helpers");

const { IGE: aes_ige } = require("@cryptography/aes");

class IGENEW {
    private ige: any;

    constructor(key: Buffer, iv: Buffer) {
        this.ige = new aes_ige(key, iv);
    }

    /**
     * Decrypts the given text in 16-bytes blocks by using the given key and 32-bytes initialization vector
     * @param cipherText {Buffer}
     * @returns {Buffer}
     */
    decryptIge(cipherText: Buffer): Buffer {
        return Helpers.convertToLittle(this.ige.decrypt(cipherText));
    }

    /**
     * Encrypts the given text in 16-bytes blocks by using the given key and 32-bytes initialization vector
     * @param plainText {Buffer}
     * @returns {Buffer}
     */
    encryptIge(plainText: Buffer): Buffer {
        const padding = plainText.length % 16;
        if (padding) {
            plainText = Buffer.concat([
                plainText,
                Helpers.generateRandomBytes(16 - padding),
            ]);
        }

        return Helpers.convertToLittle(this.ige.encrypt(plainText));
    }
}

export { IGENEW as IGE };
