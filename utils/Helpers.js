const crypto = require('crypto');
const fs = require("fs").promises;

class Helpers {


    /**
     * Generates a random long integer (8 bytes), which is optionally signed
     * @returns {number}
     */
    static generateRandomLong(signed) {
        let buf = Buffer.from(this.generateRandomBytes(8)); // 0x12345678 = 305419896
        if (signed)
            return buf.readInt32BE(0);
        else
            return buf.readUInt32LE(0);
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
    static async loadSettings(path = "../api/settings") {
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
     * @returns {[*, *]}
     */

    static calcKey(shared_key, msg_key, client) {
        let x = client !== null ? 0 : 8;
        let iv, key, sha1a, sha1b, sha1c, sha1d;
        sha1a = this.sha1((msg_key + shared_key.slice(x, (x + 32))));
        sha1b = this.sha1(((shared_key.slice((x + 32), (x + 48)) + msg_key) + shared_key.slice((x + 48), (x + 64))));
        sha1c = this.sha1((shared_key.slice((x + 64), (x + 96)) + msg_key));
        sha1d = this.sha1((msg_key + shared_key.slice((x + 96), (x + 128))));
        key = ((sha1a.slice(0, 8) + sha1b.slice(8, 20)) + sha1c.slice(4, 16));
        iv = (((sha1a.slice(8, 20) + sha1b.slice(0, 8)) + sha1c.slice(16, 20)) + sha1d.slice(0, 8));
        return [key, iv];


    }

    /**
     * Calculates the message key from the given data
     * @param data
     * @returns {Buffer}
     */
    static calcMsgKey(data) {
        return this.sha1(data).slice(4, 20);


    }

    /**
     * Generates the key data corresponding to the given nonces
     * @param serverNonce
     * @param newNonce
     * @returns {{ivBuffer: Buffer, keyBuffer: Buffer}}
     */
    static generateKeyDataFromNonces(serverNonce, newNonce) {
        let hash1 = this.sha1(Buffer.concat([newNonce, serverNonce]));
        let hash2 = this.sha1(Buffer.concat([serverNonce, newNonce]));
        let hash3 = this.sha1(Buffer.concat([newNonce, newNonce]));
        let keyBuffer = Buffer.concat([hash1, hash1.slice(0, 12)]);
        let ivBuffer = Buffer.concat([hash2.slice(12, 20), hash3, newNonce.slice(0, 4)]);
        return {keyBuffer: keyBuffer, ivBuffer: ivBuffer}
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

}

exports.helpers = Helpers;
