/// <reference types="node" />
declare class IGENEW {
    private ige;
    constructor(key: Buffer, iv: Buffer);
    /**
     * Decrypts the given text in 16-bytes blocks by using the given key and 32-bytes initialization vector
     * @param cipherText {Buffer}
     * @returns {Buffer}
     */
    decryptIge(cipherText: Buffer): Buffer;
    /**
     * Encrypts the given text in 16-bytes blocks by using the given key and 32-bytes initialization vector
     * @param plainText {Buffer}
     * @returns {Buffer}
     */
    encryptIge(plainText: Buffer): Buffer;
}
export { IGENEW as IGE };
