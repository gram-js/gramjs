const crypto = require('crypto');
const fs = require('fs').promises;

class Helpers {
    static readBigIntFromBuffer(buffer, little = true, signed = false) {
        let randBuffer = Buffer.from(buffer);
        const bytesNumber = randBuffer.length;
        if (little) {
            randBuffer = randBuffer.reverse();
        }
        let bigInt = BigInt('0x' + randBuffer.toString('hex'));
        if (signed && Math.floor(bigInt.toString('2').length / 8) >= bytesNumber) {
            bigInt -= 2n ** BigInt(bytesNumber * 8);
        }
        return bigInt;
    }

    static readBufferFromBigInt(bigInt, bytesNumber, little = true, signed = false) {
        const bitLength = bigInt.toString('2').length;

        const bytes = Math.ceil(bitLength / 8);
        if (bytesNumber < bytes) {
            throw new Error('OverflowError: int too big to convert');
        } else if (bytesNumber > bytes) {
        }
        if (!signed && bigInt < 0) {
            throw new Error('Cannot convert to unsigned');
        }
        let below = false;
        if (bigInt < 0) {
            below = true;
            bigInt = -bigInt;
        }

        const hex = bigInt.toString('16').padStart(bytesNumber * 2, '0');
        let l = Buffer.from(hex, 'hex');
        if (little) {
            l = l.reverse();
        }

        if (signed && below) {
            if (little) {
                l[0] = 256 - l[0];
                for (let i = 1; i < l.length; i++) {
                    l[i] = 255 - l[i];
                }
            } else {
                l[l.length - 1] = 256 - l[l.length - 1];
                for (let i = 0; i < l.length - 1; i++) {
                    l[i] = 255 - l[i];
                }
            }
        }
        return l;
    }

    /**
     * Generates a random long integer (8 bytes), which is optionally signed
     * @returns {BigInt}
     */
    static generateRandomLong(signed = true) {
        return this.readBigIntFromBuffer(Helpers.generateRandomBytes(8), true, signed);
    }

    /**
     * .... really javascript
     * @param n {number}
     * @param m {number}
     * @returns {number}
     */
    static mod(n, m) {
        return ((n % m) + m) % m;
    }

    /**
     * Generates a random bytes array
     * @param count
     * @returns {Buffer}
     */
    static generateRandomBytes(count) {
        return crypto.randomBytes(count);
    }

    /**
     * Loads the user settings located under `api/`
     * @param path
     * @returns {Promise<void>}
     */
    static async loadSettings(path = 'api/settings') {
        const settings = {};
        let left;
        let right;
        let valuePair;

        const data = await fs.readFile(path, 'utf-8');

        for (const line of data.toString().split('\n')) {
            valuePair = line.split('=');
            if (valuePair.length !== 2) {
                break;
            }
            left = valuePair[0].replace(/ \r?\n|\r/g, '');
            right = valuePair[1].replace(/ \r?\n|\r/g, '');
            if (!isNaN(right)) {
                settings[left] = Number.parseInt(right);
            } else {
                settings[left] = right;
            }
        }

        return settings;
    }

    /**
     * Calculate the key based on Telegram guidelines, specifying whether it's the client or not
     * @param sharedKey
     * @param msgKey
     * @param client
     * @returns {{iv: Buffer, key: Buffer}}
     */

    static calcKey(sharedKey, msgKey, client) {
        const x = client === true ? 0 : 8;
        const sha1a = Helpers.sha1(Buffer.concat([msgKey, sharedKey.slice(x, x + 32)]));
        const sha1b = Helpers.sha1(
            Buffer.concat([sharedKey.slice(x + 32, x + 48), msgKey, sharedKey.slice(x + 48, x + 64)])
        );
        const sha1c = Helpers.sha1(Buffer.concat([sharedKey.slice(x + 64, x + 96), msgKey]));
        const sha1d = Helpers.sha1(Buffer.concat([msgKey, sharedKey.slice(x + 96, x + 128)]));
        const key = Buffer.concat([sha1a.slice(0, 8), sha1b.slice(8, 20), sha1c.slice(4, 16)]);
        const iv = Buffer.concat([sha1a.slice(8, 20), sha1b.slice(0, 8), sha1c.slice(16, 20), sha1d.slice(0, 8)]);
        return { key, iv };
    }

    /**
     * Calculates the message key from the given data
     * @param data
     * @returns {Buffer}
     */
    static calcMsgKey(data) {
        return Helpers.sha1(data).slice(4, 20);
    }

    /**
     * Generates the key data corresponding to the given nonces
     * @param serverNonce
     * @param newNonce
     * @returns {{key: Buffer, iv: Buffer}}
     */
    static generateKeyDataFromNonce(serverNonce, newNonce) {
        serverNonce = Helpers.readBufferFromBigInt(serverNonce, 16, true, true);
        newNonce = Helpers.readBufferFromBigInt(newNonce, 32, true, true);
        const hash1 = Helpers.sha1(Buffer.concat([newNonce, serverNonce]));
        const hash2 = Helpers.sha1(Buffer.concat([serverNonce, newNonce]));
        const hash3 = Helpers.sha1(Buffer.concat([newNonce, newNonce]));
        const keyBuffer = Buffer.concat([hash1, hash2.slice(0, 12)]);
        const ivBuffer = Buffer.concat([hash2.slice(12, 20), hash3, newNonce.slice(0, 4)]);
        return { key: keyBuffer, iv: ivBuffer };
    }

    /**
     * Calculates the SHA1 digest for the given data
     * @param data
     * @returns {Buffer}
     */
    static sha1(data) {
        const shaSum = crypto.createHash('sha1');
        shaSum.update(data);
        return shaSum.digest();
    }

    /**
     * Calculates the SHA256 digest for the given data
     * @param data
     * @returns {Buffer}
     */
    static sha256(data) {
        const shaSum = crypto.createHash('sha256');
        shaSum.update(data);
        return shaSum.digest();
    }

    /**
     * Reads a Telegram-encoded string
     * @param buffer {Buffer}
     * @param offset {number}
     * @returns {{string: string, offset: number}}
     */
    static tgReadString(buffer, offset) {
        const res = Helpers.tgReadByte(buffer, offset);
        offset = res.offset;
        const string = res.data.toString('utf8');
        return { string, offset };
    }

    /**
     *
     * @param reader {Buffer}
     * @param offset {number}
     */
    static tgReadObject(reader, offset) {
        const constructorId = reader.readUInt32LE(offset);
        offset += 4;
        const clazz = tlobjects[constructorId];
        if (clazz === undefined) {
            /**
             * The class was None, but there's still a
             *  chance of it being a manually parsed value like bool!
             */
            if (constructorId === 0x997275b5) {
                return true;
            } else if (constructorId === 0xbc799737) {
                return false;
            }
            throw Error('type not found ' + constructorId);
        }
        return undefined;
    }

    /**
     *
     * @param buffer {Buffer}
     * @param offset {Number}
     * @returns {{data: Buffer, offset: Number}}
     */
    static tgReadByte(buffer, offset) {
        const firstByte = buffer[offset];
        offset += 1;
        let padding;
        let length;
        if (firstByte === 254) {
            length = buffer.readInt8(offset) | (buffer.readInt8(offset + 1) << 8) | (buffer.readInt8(offset + 2) << 16);
            offset += 3;
            padding = length % 4;
        } else {
            length = firstByte;
            padding = (length + 1) % 4;
        }

        const data = buffer.slice(offset, offset + length);

        offset += length;

        if (padding > 0) {
            padding = 4 - padding;
            offset += padding;
        }

        return { data: data, offset: offset };
    }

    static tgWriteString(string) {
        return Helpers.tgWriteBytes(Buffer.from(string, 'utf8'));
    }

    static tgWriteBytes(data) {
        let buffer;
        let padding;

        if (data.length < 254) {
            padding = (data.length + 1) % 4;
            if (padding !== 0) {
                padding = 4 - padding;
            }
            buffer = Buffer.concat([Buffer.from([data.length]), data]);
        } else {
            padding = data.length % 4;
            if (padding !== 0) {
                padding = 4 - padding;
            }
            buffer = Buffer.concat([
                Buffer.from([254]),
                Buffer.from([data.length % 256]),
                Buffer.from([(data.length >> 8) % 256]),
                Buffer.from([(data.length >> 16) % 256]),
                data,
            ]);
        }

        return Buffer.concat([buffer, Buffer.alloc(padding).fill(0)]);
    }

    /**
     * Fast mod pow for RSA calculation. a^b % n
     * @param a
     * @param b
     * @param n
     * @returns {bigint}
     */
    static modExp(a, b, n) {
        a = a % n;
        let result = 1n;
        let x = a;
        while (b > 0n) {
            const leastSignificantBit = b % 2n;
            b = b / 2n;
            if (leastSignificantBit === 1n) {
                result = result * x;
                result = result % n;
            }
            x = x * x;
            x = x % n;
        }
        return result;
    }

    /**
     * returns a random int from min (inclusive) and max (inclusive)
     * @param min
     * @param max
     * @returns {number}
     */
    static getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Sleeps a specified amount of time
     * @param ms time in milliseconds
     * @returns {Promise}
     */
    static sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Checks if the obj is an array
     * @param obj
     * @returns {boolean}
     */
    static isArrayLike(obj) {
        if (!obj) return false;
        const l = obj.length;
        if (typeof l != 'number' || l < 0) return false;
        if (Math.floor(l) !== l) return false;
        // fast check
        if (l > 0 && !(l - 1 in obj)) return false;
        // more complete check (optional)
        for (let i = 0; i < l; ++i) {
            if (!(i in obj)) return false;
        }
        return true;
    }
}

module.exports = Helpers;
