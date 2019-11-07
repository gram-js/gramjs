const AES = require('../crypto/AES')
const AuthKey = require('../crypto/AuthKey')
const Factorizator = require('../crypto/Factorizator')
const RSA = require('../crypto/RSA')
const Helpers = require('../Helpers')
const { ServerDHParamsFail } = require('../tl/types')
const { ServerDHParamsOk } = require('../tl/types')
const { ReqDHParamsRequest } = require('../tl/functions')
const { SecurityError } = require('../errors/Common')
const { PQInnerData } = require('../tl/types')
const BinaryReader = require('../extensions/BinaryReader')
const { ClientDHInnerData } = require('../tl/types')
const { DhGenFail } = require('../tl/types')
const { DhGenRetry } = require('../tl/types')
const { DhGenOk } = require('../tl/types')
const { SetClientDHParamsRequest } = require('../tl/functions')
const { ServerDHInnerData } = require('../tl/types')
const { ResPQ } = require('../tl/types')
const { ReqPqMultiRequest } = require('../tl/functions')

/**
 * Executes the authentication process with the Telegram servers.
 * @param sender a connected {MTProtoPlainSender}.
 * @param log
 * @returns {Promise<{authKey: *, timeOffset: *}>}
 */
async function doAuthentication(sender, log) {
    // Step 1 sending: PQ Request, endianness doesn't matter since it's random
    let bytes = Helpers.generateRandomBytes(16)

    const nonce = Helpers.readBigIntFromBuffer(bytes, false, true)

    const resPQ = await sender.send(new ReqPqMultiRequest({ nonce: nonce }))
    log.debug('Starting authKey generation step 1')

    if (!(resPQ instanceof ResPQ)) {
        throw new Error(`Step 1 answer was ${resPQ}`)
    }
    if (resPQ.nonce !== nonce) {
        throw new SecurityError('Step 1 invalid nonce from server')
    }
    const pq = Helpers.readBigIntFromBuffer(resPQ.pq, false, true)
    log.debug('Finished authKey generation step 1')
    log.debug('Starting authKey generation step 2')
    // Step 2 sending: DH Exchange
    let { p, q } = Factorizator.factorize(pq)
    p = getByteArray(p)

    q = getByteArray(q)

    bytes = Helpers.generateRandomBytes(32)
    const newNonce = Helpers.readBigIntFromBuffer(bytes, true, true)

    const pqInnerData = new PQInnerData({
        pq: getByteArray(pq), // unsigned
        p: p,
        q: q,
        nonce: resPQ.nonce,
        serverNonce: resPQ.serverNonce,
        newNonce: newNonce,
    })

    // sha_digest + data + random_bytes
    let cipherText = null
    let targetFingerprint = null
    for (const fingerprint of resPQ.serverPublicKeyFingerprints) {
        cipherText = RSA.encrypt(fingerprint.toString(), pqInnerData.bytes)
        if (cipherText !== null && cipherText !== undefined) {
            targetFingerprint = fingerprint
            break
        }
    }
    if (cipherText === null || cipherText === undefined) {
        throw new SecurityError('Step 2 could not find a valid key for fingerprints')
    }

    const serverDhParams = await sender.send(
        new ReqDHParamsRequest({
            nonce: resPQ.nonce,
            serverNonce: resPQ.serverNonce,
            p: p,
            q: q,
            publicKeyFingerprint: targetFingerprint,
            encryptedData: cipherText,
        }),
    )
    if (!(serverDhParams instanceof ServerDHParamsOk || serverDhParams instanceof ServerDHParamsFail)) {
        throw new Error(`Step 2.1 answer was ${serverDhParams}`)
    }
    if (serverDhParams.nonce !== resPQ.nonce) {
        throw new SecurityError('Step 2 invalid nonce from server')
    }

    if (serverDhParams.serverNonce !== resPQ.serverNonce) {
        throw new SecurityError('Step 2 invalid server nonce from server')
    }

    if (serverDhParams instanceof ServerDHParamsFail) {
        const sh = Helpers.sha1(Helpers.readBufferFromBigInt(newNonce, 32, true, true).slice(4, 20))
        const nnh = Helpers.readBigIntFromBuffer(sh, true, true)
        if (serverDhParams.newNonceHash !== nnh) {
            throw new SecurityError('Step 2 invalid DH fail nonce from server')
        }
    }
    if (!(serverDhParams instanceof ServerDHParamsOk)) {
        throw new Error(`Step 2.2 answer was ${serverDhParams}`)
    }
    log.debug('Finished authKey generation step 2')
    log.debug('Starting authKey generation step 3')

    // Step 3 sending: Complete DH Exchange
    const { key, iv } = Helpers.generateKeyDataFromNonce(resPQ.serverNonce, newNonce)
    if (serverDhParams.encryptedAnswer.length % 16 !== 0) {
        // See PR#453
        throw new SecurityError('Step 3 AES block size mismatch')
    }
    const plainTextAnswer = AES.decryptIge(serverDhParams.encryptedAnswer, key, iv)
    const reader = new BinaryReader(plainTextAnswer)
    reader.read(20) // hash sum
    const serverDhInner = reader.tgReadObject()
    if (!(serverDhInner instanceof ServerDHInnerData)) {
        throw new Error(`Step 3 answer was ${serverDhInner}`)
    }

    if (serverDhInner.nonce !== resPQ.nonce) {
        throw new SecurityError('Step 3 Invalid nonce in encrypted answer')
    }
    if (serverDhInner.serverNonce !== resPQ.serverNonce) {
        throw new SecurityError('Step 3 Invalid server nonce in encrypted answer')
    }
    const dhPrime = Helpers.readBigIntFromBuffer(serverDhInner.dhPrime, false, false)
    const ga = Helpers.readBigIntFromBuffer(serverDhInner.gA, false, false)
    const timeOffset = serverDhInner.serverTime - Math.floor(new Date().getTime() / 1000)

    const b = Helpers.readBigIntFromBuffer(Helpers.generateRandomBytes(256), false, false)
    const gb = Helpers.modExp(BigInt(serverDhInner.g), b, dhPrime)
    const gab = Helpers.modExp(ga, b, dhPrime)

    // Prepare client DH Inner Data
    const { bytes: clientDhInner } = new ClientDHInnerData({
        nonce: resPQ.nonce,
        serverNonce: resPQ.serverNonce,
        retryId: 0, // TODO Actual retry ID
        gB: getByteArray(gb, false),
    })

    const clientDdhInnerHashed = Buffer.concat([Helpers.sha1(clientDhInner), clientDhInner])
    // Encryption
    const clientDhEncrypted = AES.encryptIge(clientDdhInnerHashed, key, iv)
    const dhGen = await sender.send(
        new SetClientDHParamsRequest({
            nonce: resPQ.nonce,
            serverNonce: resPQ.serverNonce,
            encryptedData: clientDhEncrypted,
        }),
    )
    const nonceTypes = [DhGenOk, DhGenRetry, DhGenFail]
    if (!(dhGen instanceof nonceTypes[0] || dhGen instanceof nonceTypes[1] || dhGen instanceof nonceTypes[2])) {
        throw new Error(`Step 3.1 answer was ${dhGen}`)
    }
    const { name } = dhGen.constructor
    if (dhGen.nonce !== resPQ.nonce) {
        throw new SecurityError(`Step 3 invalid ${name} nonce from server`)
    }
    if (dhGen.serverNonce !== resPQ.serverNonce) {
        throw new SecurityError(`Step 3 invalid ${name} server nonce from server`)
    }
    const authKey = new AuthKey(getByteArray(gab))
    const nonceNumber = 1 + nonceTypes.indexOf(dhGen.constructor)

    const newNonceHash = authKey.calcNewNonceHash(newNonce, nonceNumber)
    const dhHash = dhGen[`newNonceHash${nonceNumber}`]

    if (dhHash !== newNonceHash) {
        throw new SecurityError('Step 3 invalid new nonce hash')
    }

    if (!(dhGen instanceof DhGenOk)) {
        throw new Error(`Step 3.2 answer was ${dhGen}`)
    }
    log.debug('Finished authKey generation step 3')

    return { authKey, timeOffset }
}

/**
 * Gets the arbitrary-length byte array corresponding to the given integer
 * @param integer {number,BigInt}
 * @param signed {boolean}
 * @returns {Buffer}
 */
function getByteArray(integer, signed = false) {
    const bits = integer.toString(2).length
    const byteLength = Math.floor((bits + 8 - 1) / 8)
    return Helpers.readBufferFromBigInt(BigInt(integer), byteLength, false, signed)
}

module.exports = doAuthentication
