const crypto = require('crypto');
const helpers = require("../utils/Helpers").helpers;


console.log();

class RSA {
    _server_keys = {
        '216be86c022bb4c3': new RSAServerKey("216be86c022bb4c3", parseInt('C150023E2F70DB7985DED064759CFECF0AF328E69A41DAF4D6F01B538135A6F9' +
            '1F8F8B2A0EC9BA9720CE352EFCF6C5680FFC424BD634864902DE0B4BD6D49F4E' +
            '580230E3AE97D95C8B19442B3C0A10D8F5633FECEDD6926A7F6DAB0DDB7D457F' +
            '9EA81B8465FCD6FFFEED114011DF91C059CAEDAF97625F6C96ECC74725556934' +
            'EF781D866B34F011FCE4D835A090196E9A5F0E4449AF7EB697DDB9076494CA5F' +
            '81104A305B6DD27665722C46B60E5DF680FB16B210607EF217652E60236C255F' +
            '6A28315F4083A96791D7214BF64C1DF4FD0DB1944FB26A2A57031B32EEE64AD1' +
            '5A8BA68885CDE74A5BFC920F6ABF59BA5C75506373E7130F9042DA922179251F', 16), parseInt('010001', 16)),
        'c3b42b026ce86b21': new RSAServerKey("c3b42b026ce86b21", parseInt('MIIBCgKCAQEAwVACPi9w23mF3tBkdZz+zwrzKOaaQdr01vAbU4E1pvkfj4sqDsm6' +
            'lyDONS789sVoD/xCS9Y0hkkC3gtL1tSfTlgCMOOul9lcixlEKzwKENj1Yz/s7daS' +
            'an9tqw3bfUV/nqgbhGX81v/+7RFAEd+RwFnK7a+XYl9sluzHRyVVaTTveB2GazTw' +
            'Efzk2DWgkBluml8OREmvfraX3bkHZJTKX4EQSjBbbdJ2ZXIsRrYOXfaA+xayEGB+' +
            '8hdlLmAjbCVfaigxX0CDqWeR1yFL9kwd9P0NsZRPsmoqVwMbMu7mStFai6aIhc3n' +
            'Slv8kg9qv1m6XHVQY3PnEw+QQtqSIXklHwIDAQAB', 64), parseInt('010001', 16)),
        '9a996a1db11c729b': new RSAServerKey("9a996a1db11c729b", parseInt('C150023E2F70DB7985DED064759CFECF0AF328E69A41DAF4D6F01B538135A6F9' +
            '1F8F8B2A0EC9BA9720CE352EFCF6C5680FFC424BD634864902DE0B4BD6D49F4E' +
            '580230E3AE97D95C8B19442B3C0A10D8F5633FECEDD6926A7F6DAB0DDB7D457F' +
            '9EA81B8465FCD6FFFEED114011DF91C059CAEDAF97625F6C96ECC74725556934' +
            'EF781D866B34F011FCE4D835A090196E9A5F0E4449AF7EB697DDB9076494CA5F' +
            '81104A305B6DD27665722C46B60E5DF680FB16B210607EF217652E60236C255F' +
            '6A28315F4083A96791D7214BF64C1DF4FD0DB1944FB26A2A57031B32EEE64AD1' +
            '5A8BA68885CDE74A5BFC920F6ABF59BA5C75506373E7130F9042DA922179251F', 64), parseInt('010001', 16)),

    };

    /**
     * Encrypts the given data given a fingerprint
     * @param fingerprint
     * @param data
     * @param offset
     * @param length
     */
    static encrypt(fingerprint, data, offset, length) {
        if (!(fingerprint.toLowerCase() in RSA._server_keys)) {
            return;
        }
        let key = RSA._server_keys[fingerprint.toLowerCase()];
        return key.encrypt(data, offset, length);

    }
}

class RSAServerKey {
    constructor(fingerprint, m, e) {
        this.fingerprint = fingerprint;
        this.m = m;
        this.e = e;

    }

    /**
     * Encrypts the given data with the current key
     * @param data
     * @param offset
     * @param length
     */
    encrypt(data, offset, length) {
        if (offset === undefined) {
            offset = 0;
        }
        if (length === undefined) {
            length = data.length;
        }
        let dataToWrite = data.split(offset, offset + length);
        let sha1Data = helpers.sha1(dataToWrite);
        let writer = Buffer.concat([sha1Data, dataToWrite]);

        if (length < 235) {
            writer = Buffer.concat([writer, helpers.generateRandomBytes(235 - length)]);

        }
        let result = writer.readBigInt64BE();
        result = (result ** this.e) % this.m;
        let buffer = Buffer.alloc(256);
        buffer.writeBigInt64BE(result);
    }
}

exports.RSA = RSA;
