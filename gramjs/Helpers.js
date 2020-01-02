const crypto = require('crypto')
const fs = require('fs')

/**
 * use this instead of ** because of webpack
 * @param a {bigint}
 * @param b {bigint}
 * @returns {bigint}
 */
function bigIntPower(a, b) {
    let i
    let pow = BigInt(1)

    for (i = BigInt(0); i < b; i++) {
        pow = pow * a
    }

    return pow
}

/**
 * converts a buffer to big int
 * @param buffer
 * @param little
 * @param signed
 * @returns {bigint}
 */
function readBigIntFromBuffer(buffer, little = true, signed = false) {
    let randBuffer = Buffer.from(buffer)
    const bytesNumber = randBuffer.length
    if (little) {
        randBuffer = randBuffer.reverse()
    }
    let bigInt = BigInt('0x' + randBuffer.toString('hex'))
    if (signed && Math.floor(bigInt.toString('2').length / 8) >= bytesNumber) {
        bigInt -= bigIntPower(BigInt(2), BigInt(bytesNumber * 8))
    }
    return bigInt
}

/**
 * converts a big int to a buffer
 * @param bigInt
 * @param bytesNumber
 * @param little
 * @param signed
 * @returns {Buffer}
 */
function readBufferFromBigInt(bigInt, bytesNumber, little = true, signed = false) {
    const bitLength = bigInt.toString('2').length

    const bytes = Math.ceil(bitLength / 8)
    if (bytesNumber < bytes) {
        throw new Error('OverflowError: int too big to convert')
    }
    if (!signed && bigInt < 0) {
        throw new Error('Cannot convert to unsigned')
    }
    let below = false
    if (bigInt < 0) {
        below = true
        bigInt = -bigInt
    }

    const hex = bigInt.toString('16').padStart(bytesNumber * 2, '0')
    let l = Buffer.from(hex, 'hex')
    if (little) {
        l = l.reverse()
    }

    if (signed && below) {
        if (little) {
            l[0] = 256 - l[0]
            for (let i = 1; i < l.length; i++) {
                l[i] = 255 - l[i]
            }
        } else {
            l[l.length - 1] = 256 - l[l.length - 1]
            for (let i = 0; i < l.length - 1; i++) {
                l[i] = 255 - l[i]
            }
        }
    }
    return l
}

/**
 * Generates a random long integer (8 bytes), which is optionally signed
 * @returns {BigInt}
 */
function generateRandomLong(signed = true) {
    return readBigIntFromBuffer(generateRandomBytes(8), true, signed)
}

/**
 * .... really javascript
 * @param n {number}
 * @param m {number}
 * @returns {number}
 */
function mod(n, m) {
    return ((n % m) + m) % m
}

/**
 * Generates a random bytes array
 * @param count
 * @returns {Buffer}
 */
function generateRandomBytes(count) {
    return crypto.randomBytes(count)
}


/**
 * Calculate the key based on Telegram guidelines, specifying whether it's the client or not
 * @param sharedKey
 * @param msgKey
 * @param client
 * @returns {{iv: Buffer, key: Buffer}}
 */

function calcKey(sharedKey, msgKey, client) {
    const x = client === true ? 0 : 8
    const sha1a = sha1(Buffer.concat([msgKey, sharedKey.slice(x, x + 32)]))
    const sha1b = sha1(
        Buffer.concat([sharedKey.slice(x + 32, x + 48), msgKey, sharedKey.slice(x + 48, x + 64)]),
    )
    const sha1c = sha1(Buffer.concat([sharedKey.slice(x + 64, x + 96), msgKey]))
    const sha1d = sha1(Buffer.concat([msgKey, sharedKey.slice(x + 96, x + 128)]))
    const key = Buffer.concat([sha1a.slice(0, 8), sha1b.slice(8, 20), sha1c.slice(4, 16)])
    const iv = Buffer.concat([sha1a.slice(8, 20), sha1b.slice(0, 8), sha1c.slice(16, 20), sha1d.slice(0, 8)])
    return { key, iv }
}

/**
 * Calculates the message key from the given data
 * @param data
 * @returns {Buffer}
 */
function calcMsgKey(data) {
    return sha1(data).slice(4, 20)
}

/**
 * Generates the key data corresponding to the given nonces
 * @param serverNonce
 * @param newNonce
 * @returns {{key: Buffer, iv: Buffer}}
 */
function generateKeyDataFromNonce(serverNonce, newNonce) {
    serverNonce = readBufferFromBigInt(serverNonce, 16, true, true)
    newNonce = readBufferFromBigInt(newNonce, 32, true, true)
    const hash1 = sha1(Buffer.concat([newNonce, serverNonce]))
    const hash2 = sha1(Buffer.concat([serverNonce, newNonce]))
    const hash3 = sha1(Buffer.concat([newNonce, newNonce]))
    const keyBuffer = Buffer.concat([hash1, hash2.slice(0, 12)])
    const ivBuffer = Buffer.concat([hash2.slice(12, 20), hash3, newNonce.slice(0, 4)])
    return { key: keyBuffer, iv: ivBuffer }
}

/**
 * ensures that the parent directory exists
 * @param filePath
 */
function ensureParentDirExists(filePath) {
    fs.mkdirSync(filePath, { recursive: true })
}

/**
 * Calculates the SHA1 digest for the given data
 * @param data
 * @returns {Buffer}
 */
function sha1(data) {
    const shaSum = crypto.createHash('sha1')
    shaSum.update(data)
    return shaSum.digest()
}

/**
 * Calculates the SHA256 digest for the given data
 * @param data
 * @returns {Buffer}
 */
function sha256(data) {
    const shaSum = crypto.createHash('sha256')
    shaSum.update(data)
    return shaSum.digest()
}

/**
 * Fast mod pow for RSA calculation. a^b % n
 * @param a
 * @param b
 * @param n
 * @returns {bigint}
 */
function modExp(a, b, n) {
    a = a % n
    let result = BigInt(1)
    let x = a
    while (b > BigInt(0)) {
        const leastSignificantBit = b % BigInt(2)
        b = b / BigInt(2)
        if (leastSignificantBit === BigInt(1)) {
            result = result * x
            result = result % n
        }
        x = x * x
        x = x % n
    }
    return result
}

/**
 * returns a random int from min (inclusive) and max (inclusive)
 * @param min
 * @param max
 * @returns {number}
 */
function getRandomInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Sleeps a specified amount of time
 * @param ms time in milliseconds
 * @returns {Promise}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Checks if the obj is an array
 * @param obj
 * @returns {boolean}
 */
function isArrayLike(obj) {
    if (!obj) return false
    const l = obj.length
    if (typeof l != 'number' || l < 0) return false
    if (Math.floor(l) !== l) return false
    // fast check
    if (l > 0 && !(l - 1 in obj)) return false
    // more complete check (optional)
    for (let i = 0; i < l; ++i) {
        if (!(i in obj)) return false
    }
    return true
}

/**
 * Strips whitespace from the given text modifying the provided entities.
 * This assumes that there are no overlapping entities, that their length
 * is greater or equal to one, and that their length is not out of bounds.
 */
function stripText(text, entities) {
    if (!entities || entities.length === 0) return text.trim()

    entities = Array.isArray(entities) ? entities : [entities]
    while (text && text.slice(-1).match(/\s/)) {
        const e = entities.slice(-1)
        if (e.offset + e.length === text.length) {
            if (e.length === 1) {
                delete entities[entities.length - 1]
                if (!entities) return text.trim()
            } else {
                e.length -= 1
            }
        }

        text = text.slice(0, -1)
    }

    while (text && text[0].match(/\s/)) {
        for (let i = entities.size; i > 0; i--) {
            const e = entities[i]
            if (e.offset !== 0) {
                e.offset -= 1
                continue
            }

            if (e.length === 1) {
                delete entities[0]
                if (entities.size === 0) {
                    return text.trim()
                }
            } else {
                e.length -= 1
            }
        }

        text = text(1, text.length)
    }

    return text
}

function regExpEscape(str) {
    return str.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&')
}

module.exports = {
    readBigIntFromBuffer,
    readBufferFromBigInt,
    generateRandomLong,
    mod,
    generateRandomBytes,
    calcKey,
    calcMsgKey,
    generateKeyDataFromNonce,
    sha1,
    sha256,
    modExp,
    getRandomInt,
    sleep,
    isArrayLike,
    ensureParentDirExists,
    stripText,
    regExpEscape,
}
