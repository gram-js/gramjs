const aesjs = require('aes-js')
const stackTrace = require('stack-trace')

class AESModeCTR {
    constructor(key, iv) {
        if (!(key instanceof Buffer) || !(iv instanceof Buffer) || iv.length !== 16) {
            throw new Error('Key and iv need to be a buffer')
        }
        this.cipher = new aesjs.ModeOfOperation.ctr(Buffer.from(key), Buffer.from(iv))
    }

    encrypt(data) {
        console.log('first data to encrypt is ', data.toString('hex'))
        const res = this.cipher.encrypt(data)
        return Buffer.from(res)
    }

    decrypt(data) {
        return Buffer.from(this.cipher.decrypt(data))
    }

}

module.exports = AESModeCTR
