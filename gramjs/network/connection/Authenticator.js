const AES = require("../../crypto/AES");
const AuthKey = require("../../crypto/AuthKey");
const Factorizator = require("../../crypto/Factorizator");
const RSA = require("../../crypto/RSA");
const MtProtoPlainSender = require("../MTProtoPlainSender");
const Helpers = require("../../utils/Helpers");
const BigIntBuffer = require("bigint-buffer");

/**
 *
 * @param transport
 * @returns {Promise<{authKey: AuthKey, timeOffset: BigInt}>}
 */
async function doAuthentication(transport) {
    let sender = new MtProtoPlainSender(transport);

    // Step 1 sending: PQ request
    let nonce = Helpers.generateRandomBytes(16);
    let buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(0x60469778, 0);
    buffer = Buffer.concat([buffer, nonce]);
    await sender.send(buffer);
    let offset = 0;
    // Step 1 response: PQ request
    let pq;
    let serverNonce;
    let fingerprints = Array();
    buffer = await sender.receive();

    let responseCode = buffer.readUInt32LE(offset);
    offset += 4;
    if (responseCode !== 0x05162463) {
        throw Error("invalid response code");
    }

    let nonceFromServer = buffer.slice(offset, offset + 16);
    offset += 16;
    if (!nonce.equals(nonceFromServer)) {
        throw Error("Invalid nonce from server");
    }
    serverNonce = buffer.slice(offset, offset + 16);
    offset += 16;
    let res = Helpers.tgReadByte(buffer, offset);
    let pqBytes = res.data;

    let newOffset = res.offset;
    pq = BigIntBuffer.toBigIntBE(pqBytes);

    let vectorId = buffer.readInt32LE(newOffset);
    newOffset += 4;
    if (vectorId !== 0x1cb5c415) {
        throw Error("vector error");
    }
    let fingerprints_count = buffer.readInt32LE(newOffset);
    newOffset += 4;
    for (let i = 0; i < fingerprints_count; i++) {
        fingerprints.push(buffer.slice(newOffset, newOffset + 8));
        newOffset += 8;
    }
    // Step 2 sending: DH Exchange
    let newNonce = Helpers.generateRandomBytes(32);
    let {p, q} = Factorizator.factorize(pq);
    let min = p < q ? p : q;
    let max = p > q ? p : q;

    let tempBuffer = Buffer.alloc(4);
    tempBuffer.writeUInt32LE(0x83c95aec, 0);
    let pqInnerData = Buffer.concat([
        tempBuffer,
        Helpers.tgWriteBytes(getByteArray(pq, false)),
        Helpers.tgWriteBytes(getByteArray(min, false)),
        Helpers.tgWriteBytes(getByteArray(max, false)),
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

    tempBuffer = Buffer.alloc(4);
    tempBuffer.writeUInt32LE(0xd712e4be, 0);


    let reqDhParams = Buffer.concat([
        tempBuffer,
        nonce,
        serverNonce,
        Helpers.tgWriteBytes(getByteArray(min, false)),
        Helpers.tgWriteBytes(getByteArray(max, false)),
        targetFingerprint,
        Helpers.tgWriteBytes(cipherText)
    ]);

    await sender.send(reqDhParams);
    // Step 2 response: DH Exchange
    newOffset = 0;
    let reader = await sender.receive();
    responseCode = reader.readUInt32LE(newOffset);
    newOffset += 4;
    if (responseCode === 0x79cb045d) {
        throw Error("Server DH params fail: TODO ");
    }
    if (responseCode !== 0xd0e8075c) {
        throw Error("Invalid response code: TODO ");
    }
    nonceFromServer = reader.slice(newOffset, newOffset + 16);
    newOffset += 16;
    if (!nonceFromServer.equals(nonce)) {
        throw Error("Invalid nonce from server");
    }
    let serverNonceFromServer = reader.slice(newOffset, newOffset + 16);

    if (!serverNonceFromServer.equals(serverNonce)) {
        throw Error("Invalid server nonce from server");
    }

    newOffset += 16;

    let encryptedAnswer = Helpers.tgReadByte(reader, newOffset).data;
    // Step 3 sending: Complete DH Exchange

    res = Helpers.generateKeyDataFromNonces(serverNonce, newNonce);
    let key = res.keyBuffer;
    let iv = res.ivBuffer;
    let plainTextAnswer = AES.decryptIge(encryptedAnswer, key, iv);
    let g, dhPrime, ga, timeOffset;
    let dhInnerData = plainTextAnswer;
    newOffset = 20;
    let code = dhInnerData.readUInt32LE(newOffset);
    if (code !== 0xb5890dba) {
        throw Error("Invalid DH Inner Data code:")
    }
    newOffset += 4;
    let nonceFromServer1 = dhInnerData.slice(newOffset, newOffset + 16);
    if (!nonceFromServer1.equals(nonceFromServer)) {
        throw Error("Invalid nonce in encrypted answer");
    }
    newOffset += 16;
    let serverNonceFromServer1 = dhInnerData.slice(newOffset, newOffset + 16);
    if (!serverNonceFromServer1.equals(serverNonce)) {
        throw Error("Invalid server nonce in encrypted answer");
    }
    newOffset += 16;
    g = BigInt(dhInnerData.readInt32LE(newOffset));
    newOffset += 4;

    let temp = Helpers.tgReadByte(dhInnerData, newOffset);
    newOffset = temp.offset;

    dhPrime = BigIntBuffer.toBigIntBE(temp.data);
    temp = Helpers.tgReadByte(dhInnerData, newOffset);

    newOffset = temp.offset;
    ga = BigIntBuffer.toBigIntBE(temp.data);
    let serverTime = dhInnerData.readInt32LE(newOffset);
    timeOffset = serverTime - Math.floor(new Date().getTime() / 1000);
    let b = BigIntBuffer.toBigIntBE(Helpers.generateRandomBytes(2048));
    let gb = Helpers.modExp(g, b, dhPrime);
    let gab = Helpers.modExp(ga, b, dhPrime);

    // Prepare client DH Inner Data

    tempBuffer = Buffer.alloc(4);
    tempBuffer.writeUInt32LE(0x6643b654, 0);
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
    tempBuffer = Buffer.alloc(4);
    tempBuffer.writeUInt32LE(0xf5045f1f, 0);
    let setClientDhParams = Buffer.concat([
        tempBuffer,
        nonce,
        serverNonce,
        Helpers.tgWriteBytes(clientDhInnerDataEncrypted),
    ]);
    await sender.send(setClientDhParams);

    // Step 3 response: Complete DH Exchange
    reader = await sender.receive();
    newOffset = 0;
    code = reader.readUInt32LE(newOffset);
    newOffset += 4;
    if (code === 0x3bcbf734) { //  DH Gen OK
        nonceFromServer = reader.slice(newOffset, newOffset + 16);
        newOffset += 16;
        if (!nonceFromServer.equals(nonce)) {
            throw Error("Invalid nonce from server");
        }
        serverNonceFromServer = reader.slice(newOffset, newOffset + 16);
        newOffset += 16;
        if (!serverNonceFromServer.equals(serverNonce)) {
            throw Error("Invalid server nonce from server");
        }
        let newNonceHash1 = reader.slice(newOffset, newOffset + 16);
        let authKey = new AuthKey(getByteArray(gab, false));
        let newNonceHashCalculated = authKey.calcNewNonceHash(newNonce, 1);
        if (!newNonceHash1.equals(newNonceHashCalculated)) {
            throw Error("Invalid new nonce hash");
        }
        timeOffset = BigInt(timeOffset);
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
    return fingerprint.toString("hex");

}


/**
 * Gets the arbitrary-length byte array corresponding to the given integer
 * @param integer {number,BigInt}
 * @param signed {boolean}
 * @returns {Buffer}
 */
function getByteArray(integer, signed) {
    let bits = integer.toString(2).length;
    let byteLength = Math.floor((bits + 8 - 1) / 8);
    let f;
    if (signed) {
        f = BigIntBuffer.toBufferBE(BigInt(integer), byteLength);

    } else {
        f = BigIntBuffer.toBufferBE(BigInt(integer), byteLength);
    }
    return f;
}

module.exports = doAuthentication;
