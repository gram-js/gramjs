const AES = require("../crypto/AES");
const AuthKey = require("../crypto/AuthKey");
const Factorizator = require("../crypto/Factorizator");
const RSA = require("../crypto/RSA");
const MtProtoPlainSender = require("./MTProtoPlainSender");
const Helpers = require("../utils/Helpers");

function doAuthentication(transport) {
    let sender = MtProtoPlainSender(transport);

    // Step 1 sending: PQ request
    let nonce = Helpers.generateRandomBytes(16);
    let buffer = Buffer.alloc(32);
    buffer.writeUInt32LE(0x60469778, 0);
    buffer = Buffer.concat([buffer, nonce]);
    sender.send(buffer);

    // Step 1 response: PQ request
    let pq = null;
    let serverNonce = null;
    let fingerprints = Array();
    buffer = sender.receive();
    let responseCode = buffer.readUInt32LE(0);
    if (responseCode !== 0x05162463) {
        throw Error("invalid response code");
    }
    let nonceFromServer = buffer.read(16, 8);
    if (nonce !== nonceFromServer) {
        throw Error("Invalid nonce from server");
    }
    serverNonce = buffer.read(16, 12);

    let {pqBytes, newOffset} = Helpers.tgReadByte(buffer, 12);
    pq = buffer.readBigInt64BE(newOffset);
    newOffset += 8;
    let vectorId = buffer.readInt8(newOffset);
    newOffset += 1;
    if (vectorId !== 0x1cb5c415) {
        throw Error("vector error");
    }
    let fingerprints_count = buffer.readInt8(newOffset);
    for (let i = 0; i < fingerprints_count; i++) {
        fingerprints.push(buffer.readInt32LE(newOffset));
        newOffset += 8;
    }

    // Step 2 sending: DH Exchange
    let newNonce = Helpers.generateRandomBytes(32);
    let {p, q} = Factorizator.factorize(pq);
    let tempBuffer = Buffer.alloc(8);
    tempBuffer.writeUIntLE(0x83c95aec, 0, 8);
    let pqInnerData = Buffer.concat([
        tempBuffer,
        Helpers.tgWriteBytes(getByteArray(pq, false)),
        Helpers.tgWriteBytes(getByteArray(Math.min(p, q), false)),
        Helpers.tgWriteBytes(getByteArray(Math.max(p, q), false)),
        nonce,
        serverNonce,
        newNonce,
    ]);
    let cipherText, targetFingerprint;
    for (let fingerprint of fingerprints) {
        cipherText = RSA.encrypt(getFingerprintText(fingerprint), pqInnerData);
        if (cipherText !== undefined) {
            targetFingerprint = fingerprint;
            break;
        }
    }
    if (cipherText === undefined) {
        throw Error("Could not find a valid key for fingerprints");
    }
    tempBuffer = Buffer.alloc(8);
    tempBuffer.writeUIntLE(0xd712e4be, 0, 8);

    let reqDhParams = Buffer.concat([
        tempBuffer,
        nonce,
        serverNonce,
        Helpers.tgWriteBytes(getByteArray(Math.min(p, q), false)),
        Helpers.tgWriteBytes(getByteArray(Math.max(p, q), false)),
        targetFingerprint,
        Helpers.tgWriteBytes(cipherText)
    ]);
    sender.send(reqDhParams);
    // Step 2 response: DH Exchange
    newOffset = 0;
    let reader = sender.receive();
    responseCode = reader.readInt32LE(newOffset);
    newOffset += 4;
    if (responseCode === 0x79cb045d) {
        throw Error("Server DH params fail: TODO ");
    }
    if (responseCode !== 0xd0e8075c) {
        throw Error("Invalid response code: TODO ");
    }
    nonceFromServer = reader.readIntLE(newOffset, 16);
    newOffset += 16;
    if (nonceFromServer !== nonce) {
        throw Error("Invalid nonce from server");
    }
    let serverNonceFromServer = reader.readIntLE(newOffset, 16);
    if (serverNonceFromServer !== nonceFromServer) {
        throw Error("Invalid server nonce from server");
    }
    newOffset += 16;
    let encryptedAnswer = Helpers.tgReadByte(reader, newOffset).data;

    // Step 3 sending: Complete DH Exchange

    let {key, iv} = Helpers.generateKeyDataFromNonces(serverNonce, newNonce);
    let plainTextAnswer = AES.decryptIge(encryptedAnswer, key, iv);
    let g, dhPrime, ga, timeOffset;
    let dhInnerData = plainTextAnswer;
    newOffset = 20;
    let code = dhInnerData.readUInt32BE(newOffset);
    if (code !== 0xb5890dba) {
        throw Error("Invalid DH Inner Data code:")
    }
    newOffset += 4;
    let nonceFromServer1 = dhInnerData.readIntLE(newOffset, 16);
    if (nonceFromServer1 !== nonceFromServer) {
        throw Error("Invalid nonce in encrypted answer");
    }
    newOffset += 16;
    let serverNonceFromServer1 = dhInnerData.readIntLE(newOffset, 16);
    if (serverNonceFromServer1 !== serverNonce) {
        throw Error("Invalid server nonce in encrypted answer");
    }
    newOffset += 16;
    g = dhInnerData.readInt32LE(newOffset);
    newOffset += 4;
    let temp = Helpers.tgReadByte(dhInnerData, newOffset);
    newOffset += temp.offset;

    dhPrime = temp.data.readUInt32BE(0);
    temp = Helpers.tgReadByte(dhInnerData, newOffset);
    newOffset += temp.offset;
    ga = temp.data.readUInt32BE(0);
    let serverTime = dhInnerData.readInt32LE(newOffset);
    timeOffset = serverTime - Math.floor(new Date().getTime() / 1000);
    let b = Helpers.generateRandomBytes(2048).readUInt32BE(0);
    let gb = (g ** b) % dhPrime;
    let gab = (ga * b) % dhPrime;

    // Prepare client DH Inner Data

    tempBuffer = Buffer.alloc(8);
    tempBuffer.writeUIntLE(0x6643b654, 0, 8);
    let clientDHInnerData = Buffer.concat([
        tempBuffer,
        nonce,
        serverNonce,
        Buffer.alloc(8).fill(0),
        Helpers.tgWriteBytes(getByteArray(gb, false)),
    ]);
    let clientDhInnerData = Buffer.concat([
        Helpers.sha1(clientDHInnerData),
        clientDHInnerData
    ]);

    // Encryption
    let clientDhInnerDataEncrypted = AES.encryptIge(clientDhInnerData, key, iv);

    // Prepare Set client DH params
    tempBuffer = Buffer.alloc(8);
    tempBuffer.writeUIntLE(0xf5045f1f, 0, 8);
    let setClientDhParams = Buffer.concat([
        tempBuffer,
        nonce,
        serverNonce,
        Helpers.tgWriteBytes(clientDhInnerDataEncrypted),
    ]);
    sender.send(setClientDhParams);

    // Step 3 response: Complete DH Exchange
    reader = sender.receive();
    newOffset = 0;
    code = reader.readUInt32LE(newOffset);
    newOffset += 4;
    if (code === 0x3bcbf734) { //  DH Gen OK
        nonceFromServer = reader.readIntLE(newOffset, 16);
        newOffset += 16;
        if (nonceFromServer !== nonce) {
            throw Error("Invalid nonce from server");
        }
        serverNonceFromServer = reader.readIntLE(newOffset, 16);
        newOffset += 16;
        if (serverNonceFromServer !== serverNonce) {
            throw Error("Invalid server nonce from server");
        }
        let newNonceHash1 = reader.readIntLE(newOffset, 16);
        let authKey = AuthKey(getByteArray(gab, false));
        let newNonceHashCalculated = authKey.calcNewNonceHash(newNonce, 1);
        if (newNonceHash1 !== newNonceHashCalculated) {
            throw Error("Invalid new nonce hash");
        }
        return {authKey, timeOffset};
    } else if (code === 0x46dc1fb9) {
        throw Error("dh_gen_retry");

    } else if (code === 0x46dc1fb9) {
        throw Error("dh_gen_fail");

    } else {
        throw Error("DH Gen unknown");

    }

}

function rightJustify(string, length, char) {
    let fill = [];
    while (fill.length + string.length < length) {
        fill[fill.length] = char;
    }
    return fill.join('') + string;
}

/**
 * Gets a fingerprint text in 01-23-45-67-89-AB-CD-EF format (no hyphens)
 * @param fingerprint {Array}
 * @returns {string}
 */
function getFingerprintText(fingerprint) {
    let res = "";
    for (let b of fingerprint) {
        res += rightJustify(b.toString(16), 2, '0').toUpperCase();
    }
    return res;
}

/**
 *
 * @param integer {number,BigInt}
 * @param signed {boolean}
 * @returns {number}
 */
function getByteArray(integer, signed) {
    let bits = integer.toString(2).length;
    let byteLength = Math.floor((bits + 8 - 1) / 8);
    let buffer = Buffer.alloc(byteLength);
    if (signed) {
        return buffer.readIntLE(0, byteLength);

    } else {
        return buffer.readUIntLE(0, byteLength);

    }
}
module.exports = doAuthentication;
