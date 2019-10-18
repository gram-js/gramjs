const aesjs = require('aes-js');
const Helpers = require('../utils/Helpers');

class AES {
    /**
     * Decrypts the given text in 16-bytes blocks by using the given key and 32-bytes initialization vector
     * @param cipherText {Buffer}
     * @param key {Buffer}
     * @param iv {Buffer}
     * @returns {Buffer}
     */
    static decryptIge(cipherText, key, iv) {
        let iv1 = iv.slice(0, Math.floor(iv.length / 2));
        let iv2 = iv.slice(Math.floor(iv.length / 2));
        let plainText = new Array(cipherText.length).fill(0);
        const aes = new aesjs.AES(key);
        const blocksCount = Math.floor(plainText.length / 16);
        const cipherTextBlock = new Array(16).fill(0);

        for (let blockIndex = 0; blockIndex < blocksCount; blockIndex++) {
            for (let i = 0; i < 16; i++) {
                cipherTextBlock[i] = cipherText[blockIndex * 16 + i] ^ iv2[i];
            }
            const plainTextBlock = aes.decrypt(cipherTextBlock);
            for (let i = 0; i < 16; i++) {
                plainTextBlock[i] ^= iv1[i];
            }

            iv1 = cipherText.slice(blockIndex * 16, blockIndex * 16 + 16);
            iv2 = plainTextBlock.slice(0, 16);
            plainText = new Uint8Array([
                ...plainText.slice(0, blockIndex * 16),
                ...plainTextBlock.slice(0, 16),
                ...plainText.slice(blockIndex * 16 + 16),
            ]);
        }
        return Buffer.from(plainText);
    }

    /**
     * Encrypts the given text in 16-bytes blocks by using the given key and 32-bytes initialization vector
     * @param plainText {Buffer}
     * @param key {Buffer}
     * @param iv {Buffer}
     * @returns {Buffer}
     */
    static encryptIge(plainText, key, iv) {
        const padding = plainText.length % 16;
        if (padding) {
            plainText = Buffer.concat([plainText, Helpers.generateRandomBytes(16 - padding)]);
        }

        let iv1 = iv.slice(0, Math.floor(iv.length / 2));
        let iv2 = iv.slice(Math.floor(iv.length / 2));

        const aes = new aesjs.AES(key);
        let cipherText = Buffer.alloc(0);
        const blockCount = Math.floor(plainText.length / 16);

        for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
            const plainTextBlock = Buffer.from(plainText.slice(blockIndex * 16, blockIndex * 16 + 16));

            for (let i = 0; i < 16; i++) {
                plainTextBlock[i] ^= iv1[i];
            }
            const cipherTextBlock = Buffer.from(aes.encrypt(plainTextBlock));

            for (let i = 0; i < 16; i++) {
                cipherTextBlock[i] ^= iv2[i];
            }

            iv1 = cipherTextBlock;
            iv2 = plainText.slice(blockIndex * 16, blockIndex * 16 + 16);
            cipherText = Buffer.concat([cipherText, cipherTextBlock]);
        }
        return cipherText;
    }
}

module.exports = AES;
