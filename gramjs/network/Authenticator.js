const AES = require("../crypto/AES");
const AuthKey = require("../crypto/AuthKey");
const Factorizator = require("../crypto/Factorizator");
const RSA = require("../crypto/RSA");
const Helpers = require("../utils/Helpers");
const {ServerDHParamsFail} = require("../tl/types");
const {ServerDHParamsOk} = require("../tl/types");
const {ReqDHParamsRequest} = require("../tl/functions");
const {SecurityError} = require("../errors/Common");
const {PQInnerData} = require("../tl/types");
const BinaryReader = require("../extensions/BinaryReader");
const {ClientDHInnerData} = require("../tl/types");
const {DhGenFail} = require("../tl/types");
const {DhGenRetry} = require("../tl/types");
const {DhGenOk} = require("../tl/types");
const {SetClientDHParamsRequest} = require("../tl/functions");
const {ServerDHInnerData} = require("../tl/types");
const {ResPQ} = require("../tl/types");
const {ReqPqMultiRequest} = require("../tl/functions");


/**
 * Executes the authentication process with the Telegram servers.
 * @param sender a connected {MTProtoPlainSender}.
 * @returns {Promise<{authKey: *, timeOffset: *}>}
 */
async function doAuthentication(sender) {

    // Step 1 sending: PQ Request, endianness doesn't matter since it's random
    let bytes = Helpers.generateRandomBytes(16);

    let nonce = Helpers.readBigIntFromBuffer(bytes, false);

    let resPQ = await sender.send(new ReqPqMultiRequest({nonce: nonce}));
    console.log(resPQ);
    if (!(resPQ instanceof ResPQ)) {
        throw new Error(`Step 1 answer was ${resPQ}`)
    }
    if (resPQ.nonce !== nonce) {
        throw new SecurityError("Step 1 invalid nonce from server")
    }
    let pq = Helpers.readBigIntFromBuffer(resPQ.pq, false);

    // Step 2 sending: DH Exchange
    let {p, q} = Factorizator.factorize(pq);
    p = getByteArray(p);
    q = getByteArray(q);
    bytes = Helpers.generateRandomBytes(32);
    let newNonce = Helpers.readBigIntFromBuffer(bytes);

    console.log(newNonce);

    let pqInnerData = new PQInnerData({
            pq: getByteArray(pq),
            p: p,
            q: q,
            nonce: resPQ.nonce,
            serverNonce: resPQ.serverNonce,
            newNonce: newNonce

        }
    );

    // sha_digest + data + random_bytes
    let cipherText = null;
    let targetFingerprint = null;
    for (let fingerprint of resPQ.serverPublicKeyFingerprints) {
        cipherText = RSA.encrypt(fingerprint.toString(), pqInnerData.bytes);
        if (cipherText !== null && cipherText !== undefined) {
            targetFingerprint = fingerprint;
            break
        }
    }
    if (cipherText === null || cipherText === undefined) {
        throw new SecurityError(
            'Step 2 could not find a valid key for fingerprints');
    }
    let serverDhParams = await sender.send(new ReqDHParamsRequest({
            nonce: resPQ.nonce,
            serverNonce: resPQ.serverNonce,
            p: p, q: q,
            publicKeyFingerprint: getFingerprintText(targetFingerprint),
            encryptedData: cipherText
        }
    ));
    console.log(serverDhParams);
    if (!(serverDhParams instanceof ServerDHParamsOk || serverDhParams instanceof ServerDHParamsFail)) {
        throw new Error(`Step 2.1 answer was ${serverDhParams}`)
    }
    if (serverDhParams.nonce !== resPQ.nonce) {
        throw new SecurityError('Step 2 invalid nonce from server');

    }

    if (serverDhParams.serverNonce !== resPQ.serverNonce) {
        throw new SecurityError('Step 2 invalid server nonce from server')
    }

    if (serverDhParams instanceof ServerDHParamsFail) {
        let sh = Helpers.sha1(Helpers.readBufferFromBigInt(newNonce, 32).slice(4, 20));
        let nnh = Helpers.readBigIntFromBuffer(sh);
        if (serverDhParams.newNonceHash !== nnh) {
            throw new SecurityError('Step 2 invalid DH fail nonce from server')

        }
    }
    if (!(serverDhParams instanceof ServerDHParamsOk)) {
        console.log(`Step 2.2 answer was ${serverDhParams}`);
    }

    // Step 3 sending: Complete DH Exchange
    let {key, iv} = Helpers.generateKeyDataFromNonce(resPQ.serverNonce, newNonce);

    if (serverDhParams.encryptedAnswer.length % 16 !== 0) {
        // See PR#453
        throw new SecurityError('Step 3 AES block size mismatch')
    }
    let plainTextAnswer = AES.decryptIge(
        serverDhParams.encryptedAnswer, key, iv
    );
    console.log(plainTextAnswer.toString("hex"));

    let reader = new BinaryReader(plainTextAnswer);
    reader.read(20); // hash sum
    let serverDhInner = reader.tgReadObject();
    if (!(serverDhInner instanceof ServerDHInnerData)) {
        throw new Error(`Step 3 answer was ${serverDhInner}`)
    }

    if (serverDhInner.nonce !== resPQ.nonce) {
        throw new SecurityError('Step 3 Invalid nonce in encrypted answer')
    }
    if (serverDhInner.serverNonce !== resPQ.serverNonce) {
        throw new SecurityError('Step 3 Invalid server nonce in encrypted answer')
    }
    let dhPrime = Helpers.readBigIntFromBuffer(serverDhInner.dhPrime, false, false);
    let ga = Helpers.readBigIntFromBuffer(serverDhInner.gA, false, false);
    let timeOffset = serverDhInner.serverTime - Math.floor(new Date().getTime() / 1000);

    let b = Helpers.readBigIntFromBuffer(Helpers.generateRandomBytes(256), false, false);
    let gb = Helpers.modExp(BigInt(serverDhInner.g), b, dhPrime);
    let gab = Helpers.modExp(ga, b, dhPrime);

    // Prepare client DH Inner Data
    let clientDhInner = new ClientDHInnerData({
            nonce: resPQ.nonce,
            serverNonce: resPQ.serverNonce,
            retryId: 0,  // TODO Actual retry ID
            gB: getByteArray(gb, false)
        }
    ).bytes;

    let clientDdhInnerHashed = Buffer.concat([
        Helpers.sha1(clientDhInner),
        clientDhInner
    ]);
    // Encryption
    let clientDhEncrypted = AES.encryptIge(clientDdhInnerHashed, key, iv);
    let dhGen = await sender.send(new SetClientDHParamsRequest({
            nonce: resPQ.nonce,
            serverNonce: resPQ.serverNonce,
            encryptedData: clientDhEncrypted,
        }
    ));
    console.log(dhGen);
    let nonceTypes = [DhGenOk, DhGenRetry, DhGenFail];
    if (!(dhGen instanceof nonceTypes[0] || dhGen instanceof nonceTypes[1] || dhGen instanceof nonceTypes[2])) {
        throw new Error(`Step 3.1 answer was ${dhGen}`)
    }
    let name = dhGen.constructor.name;
    if (dhGen.nonce !== resPQ.nonce) {
        throw new SecurityError(`Step 3 invalid ${name} nonce from server`)
    }
    if (dhGen.serverNonce !== resPQ.serverNonce) {
        throw new SecurityError(`Step 3 invalid ${name} server nonce from server`)

    }
    console.log("GAB is ", gab);
    let authKey = new AuthKey(getByteArray(gab));
    let nonceNumber = 1 + nonceTypes.indexOf(dhGen.constructor);
    console.log("nonce number is ", nonceNumber);
    console.log("newNonce is ", newNonce);

    let newNonceHash = authKey.calcNewNonceHash(newNonce, nonceNumber);
    console.log("newNonceHash is ", newNonceHash);
    let dhHash = dhGen[`newNonceHash${nonceNumber}`];
    console.log("dhHash is ", dhHash);
    /*
    if (dhHash !== newNonceHash) {
        throw new SecurityError('Step 3 invalid new nonce hash');
    }
 */
    if (!(dhGen instanceof DhGenOk)) {
        throw new Error(`Step 3.2 answer was ${dhGen}`)
    }

    return {authKey, timeOffset};


}


/**
 * Gets a fingerprint text in 01-23-45-67-89-AB-CD-EF format (no hyphens)
 * @param fingerprint {Array}
 * @returns {string}
 */
function getFingerprintText(fingerprint) {
    return fingerprint.toString();
}


/**
 * Gets the arbitrary-length byte array corresponding to the given integer
 * @param integer {number,BigInt}
 * @param signed {boolean}
 * @returns {Buffer}
 */
function getByteArray(integer, signed = false) {
    let bits = integer.toString(2).length;
    let byteLength = Math.floor((bits + 8 - 1) / 8);
    let f;
    f = Helpers.readBufferFromBigInt(BigInt(integer), byteLength, false, signed);

    return f;
}

module.exports = doAuthentication;
