const crypto = require('./crypto')
const { generateRandomBytes } = require('../Helpers')

class IGE {
    /**
     * Decrypts the given text in 16-bytes blocks by using the given key and 32-bytes initialization vector
     * @param cipherText {Buffer}
     * @param key {Buffer}
     * @param iv {Buffer}
     * @returns {Buffer}
     */
    static decryptIge(cipherText, key, iv) {

        let iv1 = iv.slice(0, Math.floor(iv.length / 2))
        let iv2 = iv.slice(Math.floor(iv.length / 2))
        let plainText = []
        const aes = crypto.createDecipheriv('AES-256-ECB', key, Buffer.alloc(0))
        //aes.setAutoPadding(true)
        const blocksCount = Math.floor(cipherText.length / 16)
        const cipherTextBlock = Buffer.alloc(16)
            .fill(0)

        for (let blockIndex = 0; blockIndex < blocksCount; blockIndex++) {
            for (let i = 0; i < 16; i++) {
                cipherTextBlock[i] = cipherText[blockIndex * 16 + i] ^ iv2[i]
            }
            //This might be a bug in the crypto module
            aes.update(cipherTextBlock)
            const plainTextBlock =Buffer.from(aes.update(cipherTextBlock))

            for (let i = 0; i < 16; i++) {
                plainTextBlock[i] ^= iv1[i]
            }

            iv1 = cipherText.slice(blockIndex * 16, blockIndex * 16 + 16)
            iv2 = plainTextBlock.slice(0, 16)

            Array.prototype.push.apply(plainText, iv2)
        }
        return Buffer.from(plainText)
    }

    /**
     * Encrypts the given text in 16-bytes blocks by using the given key and 32-bytes initialization vector
     * @param plainText {Buffer}
     * @param key {Buffer}
     * @param iv {Buffer}
     * @returns {Buffer}
     */
    static encryptIge(plainText, key, iv) {
        const padding = plainText.length % 16
        if (padding) {
            plainText = Buffer.concat([plainText, generateRandomBytes(16 - padding)])
        }

        let iv1 = iv.slice(0, Math.floor(iv.length / 2))
        let iv2 = iv.slice(Math.floor(iv.length / 2))
        const aes = crypto.createCipheriv('AES-256-ECB', key, Buffer.alloc(0))
        //aes.setAutoPadding(true)
        let cipherText = Buffer.alloc(0)
        const blockCount = Math.floor(plainText.length / 16)

        for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
            const plainTextBlock = Buffer.from(plainText.slice(blockIndex * 16, blockIndex * 16 + 16))

            for (let i = 0; i < 16; i++) {
                plainTextBlock[i] ^= iv1[i]
            }
            const cipherTextBlock = Buffer.from(aes.update(plainTextBlock))

            for (let i = 0; i < 16; i++) {
                cipherTextBlock[i] ^= iv2[i]
            }

            iv1 = cipherTextBlock
            iv2 = plainText.slice(blockIndex * 16, blockIndex * 16 + 16)
            cipherText = Buffer.concat([cipherText, cipherTextBlock])
        }
        return cipherText
    }
}

module.exports = IGE
