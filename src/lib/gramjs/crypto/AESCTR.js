const crypto = require('crypto')

class AESModeCTR {
    constructor(key, iv) {
        if (!(key instanceof Buffer) || !(iv instanceof Buffer) || iv.length !== 16) {
            throw new Error('Key and iv need to be a buffer')
        }
        this.cipher = crypto.createCipheriv('AES-256-CTR', key, iv)
    }

    encrypt(data) {
        return this.cipher.update(data)
    }


}

module.exports = AESModeCTR
