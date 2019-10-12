const AES = require("../crypto/AES");
const AuthKey = require("../crypto/AuthKey");
const Factorizator = require("../crypto/Factorizator");
const RSA = require("../crypto/RSA");
const MtProtoPlainSender = require("./MTProtoPlainSender");
const Helpers = require("../utils/Helpers");
const BigIntBuffer = require("bigint-buffer");
const {ServerDHParamsFail} = require("../tl/types");
const {ServerDHParamsOk} = require("../tl/types");
const {ReqDHParamsRequest} = require("../tl/functions");
const {SecurityError} = require("../errors/Common");
const {PQInnerData} = require("../tl/types");
const BinaryReader = require("../extensions/BinaryReader");
const {DhGenFail} = require("../tl/types");
const {DhGenRetry} = require("../tl/types");
const {DhGenOk} = require("../tl/types");
const {SetClientDHParamsRequest} = require("../tl/functions");
const {ServerDHInnerData} = require("../tl/types");
const {ResPQ} = require("../tl/types");
const {ReqPqMultiRequest} = require("../tl/functions");


/**
 * Executes the authentication process with the Telegram servers.

 *@param sender: a connected `MTProtoPlainSender`.
 *@return: returns a (authorization key, time offset) tuple.
 */
async function doAuthentication(sender) {

    // Step 1 sending: PQ Request, endianness doesn't matter since it's random
    let nonce = Helpers.generateRandomBytes(16);
    let resPQ = await sender.send(ReqPqMultiRequest(nonce));
    if (!(resPQ instanceof ResPQ)) {
        throw new Error(`Step 1 answer was ${resPQ}`)
    }
    if (!resPQ.nonce.equals(nonce)) {
        throw new SecurityError("Step 1 invalid nonce from server'")
    }
    let pq = BigIntBuffer.toBigIntBE(resPQ.pq);

    // Step 2 sending: DH Exchange
    let {p, q} = Factorizator.factorize(pq);
    p = getByteArray(p);
    q = getByteArray(q);
    let newNonce = Helpers.generateRandomBytes(32);
    let pqInnerData = PQInnerData({
            pq: getByteArray(pq),
            p: p,
            q: q,
            nonce: resPQ.nonce,
            server_nonce: resPQ.server_nonce,
            new_nonce: newNonce

        }
    );

    // sha_digest + data + random_bytes
    let cipherText = null;
    let targetFingerprint = null;
    for (let fingerprint of resPQ.server_public_key_fingerprints) {
        cipherText = RSA.encrypt(getFingerprintText(fingerprint), pqInnerData);
        if (cipherText !== null) {
            targetFingerprint = fingerprint;
            break
        }
    }
    if (cipherText != null) {
        throw new SecurityError(
            'Step 2 could not find a valid key for fingerprints');
    }
    let serverDhParams = await sender.send(ReqDHParamsRequest({
            nonce: resPQ.nonce,
            server_nonce: resPQ.server_nonce,
            p: p, q: q,
            public_key_fingerprint: targetFingerprint,
            encrypted_data: cipherText
        }
    ));
    if (!(serverDhParams instanceof ServerDHParamsOk || serverDhParams instanceof ServerDHParamsFail)) {
        throw new Error(`Step 2.1 answer was ${serverDhParams}`)
    }
    if (!serverDhParams.nonce.equals(resPQ.nonce)) {
        throw new SecurityError('Step 2 invalid nonce from server');

    }

    if (!serverDhParams.server_nonce.equals(resPQ.server_nonce)) {
        throw new SecurityError('Step 2 invalid server nonce from server')
    }

    if (serverDhParams instanceof ServerDHParamsFail) {
        let sh = Helpers.sha1(BigIntBuffer.toBufferLE(newNonce, 32).slice(4, 20));
        let nnh = BigIntBuffer.toBigIntLE(sh);
        if (serverDhParams.new_nonce_hash !== nnh) {
            throw new SecurityError('Step 2 invalid DH fail nonce from server')

        }
    }
    if (!(serverDhParams instanceof ServerDHParamsOk)) {
        console.log(`Step 2.2 answer was ${serverDhParams}`);
    }

    // Step 3 sending: Complete DH Exchange
    let {key, iv} = Helpers.generateKeyDataFromNonces(resPQ.server_nonce, newNonce);

    if (serverDhParams.encrypted_answer.length % 16 !== 0) {
        // See PR#453
        throw new SecurityError('Step 3 AES block size mismatch')
    }
    let plainTextAnswer = AES.decryptIge(
        serverDhParams.encrypted_answer, key, iv
    );

    let reader = new BinaryReader(plainTextAnswer);
    reader.read(20); // hash sum
    let serverDhInner = reader.tgReadObject();
    if (!(serverDhInner instanceof ServerDHInnerData)) {
        throw new Error(`Step 3 answer was ${serverDhInner}`)
    }

    if (!serverDhInner.nonce.equals(resPQ.nonce)) {
        throw new SecurityError('Step 3 Invalid nonce in encrypted answer')
    }
    if (!serverDhInner.serverNonce.equals(resSQ.serverNonce)) {
        throw new SecurityError('Step 3 Invalid server nonce in encrypted answer')
    }
    let dhPrime = BigIntBuffer.toBigIntLE(serverDhInner.dhPrime);
    let ga = BigIntBuffer.toBigIntLE(serverDhInner.gA);
    let timeOffset = serverDhInner.serverTime - Math.floor(new Date().getTime() / 1000);

    let b = BigIntBuffer.toBigIntLE(Helpers.generateRandomBytes(256));
    let gb = Helpers.modExp(serverDhInner.g, b, dhPrime);
    let gab = Helpers.modExp(ga, b, dhPrime);

    // Prepare client DH Inner Data
    let clientDhInner = new ClientDHInnerData({
            nonce: res_pq.nonce,
            server_nonce: res_pq.server_nonce,
            retry_id: 0,  // TODO Actual retry ID
            g_b: getByteArray(gb, false)
        }
    ).toBytes();

    let clientDdhInnerHashed = Buffer.concat([
        Helpers.sha1(clientDhInner),
        clientDhInner
    ]);
    // Encryption
    let clientDhEncrypted = AES.encryptIge(clientDdhInnerHashed, key, iv);
    let dhGen = await sender.send(new SetClientDHParamsRequest({
            nonce: resPQ.nonce,
            server_nonce: resPQ.server_nonce,
            encrypted_data: clientDhEncrypted,
        }
    ));
    let nonceTypes = [DhGenOk, DhGenRetry, DhGenFail];
    if (!(dhGen instanceof nonceTypes[0] || dhGen instanceof nonceTypes[1] || dhGen instanceof nonceTypes[2])) {
        throw new Error(`Step 3.1 answer was ${dhGen}`)
    }
    let name = dhGen.constructor.name;
    if (!dhGen.nonce.equals(resPQ.nonce)) {
        throw new SecurityError(`Step 3 invalid ${name} nonce from server`)
    }
    if (!dhGen.server_nonce.equals(resPQ.server_nonce)) {
        throw new SecurityError(`Step 3 invalid ${name} server nonce from server`)

    }
    let authKey = new AuthKey(getByteArray(gab));
    let nonceNumber = 1 + nonceTypes.indexOf(typeof (dhGen));
    let newNonceHash = authKey.calcNewNonceHash(newNonce, nonceNumber);
    let dhHash = dhGen[`new_nonce_hash${nonceNumber}`];
    if (!dhHash.equals(newNonceHash)) {
        throw new SecurityError('Step 3 invalid new nonce hash');
    }
    if (!(dhGen instanceof DhGenOk)) {
        throw new Error(`Step 3.2 answer was ${dhGen}`)
    }

    return {authKey, timeOffset};


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
