const crypto = require('crypto');
const fs = require("fs").promises;

class Helpers {


    /**
     * Generates a random long integer (8 bytes), which is optionally signed
     * @returns {BigInt}
     */
    static generateRandomLong(signed) {
        let buf = Buffer.from(Helpers.generateRandomBytes(8)); // 0x12345678 = 305419896
        if (signed)
            return buf.readBigInt64LE(0);
        else
            return buf.readBigUInt64LE(0);
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
    static async loadSettings(path = "api/settings") {
        let settings = {};
        let left, right, value_pair;

        let data = await fs.readFile(path, 'utf-8');

        for (let line of data.toString().split('\n')) {
            value_pair = line.split("=");
            if (value_pair.length !== 2) {
                break;
            }
            left = value_pair[0].replace(/ \r?\n|\r/g, '');
            right = value_pair[1].replace(/ \r?\n|\r/g, '');
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
     * @param shared_key
     * @param msg_key
     * @param client
     * @returns {{iv: Buffer, key: Buffer}}
     */

    static calcKey(shared_key, msg_key, client) {
        let x = client === true ? 0 : 8;
        let iv, key, sha1a, sha1b, sha1c, sha1d;
        sha1a = Helpers.sha1(Buffer.concat([
            msg_key,
            shared_key.slice(x, (x + 32))
        ]));
        sha1b = Helpers.sha1(Buffer.concat([
            shared_key.slice(x + 32, x + 48),
            msg_key,
            shared_key.slice(x + 48, x + 64)
        ]));
        sha1c = Helpers.sha1(Buffer.concat([
            shared_key.slice(x + 64, x + 96),
            msg_key
        ]));
        sha1d = Helpers.sha1(Buffer.concat([
            msg_key,
            shared_key.slice((x + 96), (x + 128))
        ]));
        key = Buffer.concat([
            sha1a.slice(0, 8),
            sha1b.slice(8, 20),
            sha1c.slice(4, 16)]);
        iv = Buffer.concat([
            sha1a.slice(8, 20),
            sha1b.slice(0, 8),
            sha1c.slice(16, 20),
            sha1d.slice(0, 8)]);
        return {key, iv}

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
    static generateKeyDataFromNonces(serverNonce, newNonce) {
        let hash1 = Helpers.sha1(Buffer.concat([newNonce, serverNonce]));
        let hash2 = Helpers.sha1(Buffer.concat([serverNonce, newNonce]));
        let hash3 = Helpers.sha1(Buffer.concat([newNonce, newNonce]));
        let keyBuffer = Buffer.concat([hash1, hash2.slice(0, 12)]);
        let ivBuffer = Buffer.concat([hash2.slice(12, 20), hash3, newNonce.slice(0, 4)]);
        return {key: keyBuffer, iv: ivBuffer}
    }

    /**
     * Calculates the SHA1 digest for the given data
     * @param data
     * @returns {Buffer}
     */
    static sha1(data) {
        let shaSum = crypto.createHash('sha1');
        shaSum.update(data);
        return shaSum.digest();

    }

    /**
     * Calculates the SHA256 digest for the given data
     * @param data
     * @returns {Buffer}
     */
    static sha256(data) {
        let shaSum = crypto.createHash('sha256');
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
        let res = Helpers.tgReadByte(buffer, offset);
        offset = res.offset;
        let string = res.data.toString("utf8");
        return {string, offset}
    }

    /**
     *
     * @param reader {Buffer}
     * @param offset {number}
     */
    static tgReadObject(reader, offset) {
        let constructorId = reader.readUInt32LE(offset);
        offset += 4;
        let clazz = tlobjects[constructorId];
        if (clazz === undefined) {
            /**
             * The class was None, but there's still a
             *  chance of it being a manually parsed value like bool!
             */
            if (constructorId === 0x997275b5) {
                return true
            } else if (constructorId === 0xbc799737) {
                return false
            }
            throw Error("type not found " + constructorId);
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
        let firstByte = buffer[offset];
        offset += 1;
        let padding, length;
        if (firstByte === 254) {
            length = buffer.readInt8(offset) | (buffer.readInt8(offset + 1) << 8) | (buffer.readInt8(offset + 2) << 16);
            offset += 3;
            padding = length % 4;
        } else {
            length = firstByte;
            padding = (length + 1) % 4;
        }

        let data = buffer.slice(offset, offset + length);

        offset += length;

        if (padding > 0) {
            padding = 4 - padding;
            offset += padding;
        }

        return {data: data, offset: offset}
    }


    static tgWriteString(string) {
        return Helpers.tgWriteBytes(Buffer.from(string, "utf8"));
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
        while (b > 0) {
            let leastSignificantBit = b % 2n;
            b = b / 2n;
            if (leastSignificantBit === 1n) {
                result = result * x;
                result = result % n;
            }
            x = x * x;
            x = x % n;
        }
        return result;
    };

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
    static sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

}

module.exports = Helpers;

console.log(Helpers.sha256("ok"));
