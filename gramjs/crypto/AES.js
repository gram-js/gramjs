const aesjs = require('aes-js');


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
        let aes = new aesjs.AES(key);
        let blocksCount = Math.floor(plainText.length / 16);
        let cipherTextBlock = new Array(16).fill(0);

        for (let blockIndex = 0; blockIndex < blocksCount; blockIndex++) {
            for (let i = 0; i < 16; i++) {
                cipherTextBlock[i] = cipherText[blockIndex * 16 + i] ^ iv2[i];
            }
            let plainTextBlock = aes.decrypt(cipherTextBlock);
            for (let i = 0; i < 16; i++) {
                plainTextBlock[i] ^= iv1[i];
            }

            iv1 = cipherText.slice(blockIndex * 16, blockIndex * 16 + 16);
            iv2 = plainTextBlock.slice(0, 16);
            plainText = new Uint8Array([
                ...plainText.slice(0, blockIndex * 16),
                ...plainTextBlock.slice(0, 16),
                ...plainText.slice(blockIndex * 16 + 16)
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

        if (plainText.length % 16 !== 0) {
            let padding = new Uint8Array(16 - plainText.length % 16);
            plainText = new Uint8Array([
                ...plainText,
                ...padding,
            ]);
        }
        let iv1 = iv.slice(0, Math.floor(iv.length / 2));
        let iv2 = iv.slice(Math.floor(iv.length / 2));
        let aes = new aesjs.AES(key);
        let blocksCount = Math.floor(plainText.length / 16);
        let cipherText = new Array(plainText.length).fill(0);
        for (let blockIndex = 0; blockIndex < blocksCount; blockIndex++) {
            let plainTextBlock = plainText.slice(blockIndex * 16, blockIndex * 16 + 16);

            for (let i = 0; i < 16; i++) {
                plainTextBlock[i] ^= iv1[i];
            }
            let cipherTextBlock = aes.encrypt(plainTextBlock);
            for (let i = 0; i < 16; i++) {
                cipherTextBlock[i] ^= iv2[i];
            }

            iv1 = cipherTextBlock.slice(0, 16);
            iv2 = plainText.slice(blockIndex * 16, blockIndex * 16 + 16);
            cipherText = new Uint8Array([
                ...cipherText.slice(0, blockIndex * 16),
                ...cipherTextBlock.slice(0, 16),
                ...cipherText.slice(blockIndex * 16 + 16)
            ]);
        }
        return Buffer.from(cipherText);
    }

}

module.exports = AES;
