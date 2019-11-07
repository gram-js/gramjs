const aesjs = require('aes-js')
const stackTrace = require('stack-trace')

class AESModeCTR {
    constructor(key, iv) {
        if (!(key instanceof Buffer) || !(iv instanceof Buffer) || iv.length !== 16) {
            throw new Error('Key and iv need to be a buffer')
        }
        this.key = key
        this.iv = iv
        this.cipher = new aesjs.ModeOfOperation.ctr(key, iv)
    }

    encrypt(data) {
        return Buffer.from(this.cipher.encrypt(data))
    }

    decrypt(data) {
        return Buffer.from(this.cipher.decrypt(data))
    }

}

module.exports = AESModeCTR
