"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doAuthentication = void 0;
const Helpers_1 = require("../Helpers");
const tl_1 = require("../tl");
const errors_1 = require("../errors");
const Factorizator_1 = require("../crypto/Factorizator");
const RSA_1 = require("../crypto/RSA");
const IGE_1 = require("../crypto/IGE");
const big_integer_1 = __importDefault(require("big-integer"));
const extensions_1 = require("../extensions");
const AuthKey_1 = require("../crypto/AuthKey");
const RETRIES = 20;
async function doAuthentication(sender, log) {
    // Step 1 sending: PQ Request, endianness doesn't matter since it's random
    let bytes = (0, Helpers_1.generateRandomBytes)(16);
    const nonce = (0, Helpers_1.readBigIntFromBuffer)(bytes, false, true);
    const resPQ = await sender.send(new tl_1.Api.ReqPqMulti({ nonce }));
    log.debug("Starting authKey generation step 1");
    if (!(resPQ instanceof tl_1.Api.ResPQ)) {
        throw new errors_1.SecurityError(`Step 1 answer was ${resPQ}`);
    }
    if (resPQ.nonce.neq(nonce)) {
        throw new errors_1.SecurityError("Step 1 invalid nonce from server");
    }
    const pq = (0, Helpers_1.readBigIntFromBuffer)(resPQ.pq, false, true);
    log.debug("Finished authKey generation step 1");
    // Step 2 sending: DH Exchange
    const { p, q } = Factorizator_1.Factorizator.factorize(pq);
    const pBuffer = (0, Helpers_1.getByteArray)(p);
    const qBuffer = (0, Helpers_1.getByteArray)(q);
    bytes = (0, Helpers_1.generateRandomBytes)(32);
    const newNonce = (0, Helpers_1.readBigIntFromBuffer)(bytes, true, true);
    const pqInnerData = new tl_1.Api.PQInnerData({
        pq: (0, Helpers_1.getByteArray)(pq),
        p: pBuffer,
        q: qBuffer,
        nonce: resPQ.nonce,
        serverNonce: resPQ.serverNonce,
        newNonce,
    }).getBytes();
    if (pqInnerData.length > 144) {
        throw new errors_1.SecurityError("Step 1 invalid nonce from server");
    }
    let targetFingerprint;
    let targetKey;
    for (const fingerprint of resPQ.serverPublicKeyFingerprints) {
        targetKey = RSA_1._serverKeys.get(fingerprint.toString());
        if (targetKey !== undefined) {
            targetFingerprint = fingerprint;
            break;
        }
    }
    if (targetFingerprint === undefined || targetKey === undefined) {
        throw new errors_1.SecurityError("Step 2 could not find a valid key for fingerprints");
    }
    // Value should be padded to be made 192 exactly
    const padding = (0, Helpers_1.generateRandomBytes)(192 - pqInnerData.length);
    const dataWithPadding = Buffer.concat([pqInnerData, padding]);
    const dataPadReversed = Buffer.from(dataWithPadding).reverse();
    let encryptedData;
    for (let i = 0; i < RETRIES; i++) {
        const tempKey = (0, Helpers_1.generateRandomBytes)(32);
        const shaDigestKeyWithData = await (0, Helpers_1.sha256)(Buffer.concat([tempKey, dataWithPadding]));
        const dataWithHash = Buffer.concat([
            dataPadReversed,
            shaDigestKeyWithData,
        ]);
        const ige = new IGE_1.IGE(tempKey, Buffer.alloc(32));
        const aesEncrypted = ige.encryptIge(dataWithHash);
        const tempKeyXor = (0, Helpers_1.bufferXor)(tempKey, await (0, Helpers_1.sha256)(aesEncrypted));
        const keyAesEncrypted = Buffer.concat([tempKeyXor, aesEncrypted]);
        const keyAesEncryptedInt = (0, Helpers_1.readBigIntFromBuffer)(keyAesEncrypted, false, false);
        if (keyAesEncryptedInt.greaterOrEquals(targetKey.n)) {
            log.debug("Aes key greater than RSA. retrying");
            continue;
        }
        const encryptedDataBuffer = (0, Helpers_1.modExp)(keyAesEncryptedInt, (0, big_integer_1.default)(targetKey.e), targetKey.n);
        encryptedData = (0, Helpers_1.readBufferFromBigInt)(encryptedDataBuffer, 256, false, false);
        break;
    }
    if (encryptedData === undefined) {
        throw new errors_1.SecurityError("Step 2 could create a secure encrypted key");
    }
    log.debug("Step 2 : Generated a secure aes encrypted data");
    const serverDhParams = await sender.send(new tl_1.Api.ReqDHParams({
        nonce: resPQ.nonce,
        serverNonce: resPQ.serverNonce,
        p: pBuffer,
        q: qBuffer,
        publicKeyFingerprint: targetFingerprint,
        encryptedData,
    }));
    if (!(serverDhParams instanceof tl_1.Api.ServerDHParamsOk ||
        serverDhParams instanceof tl_1.Api.ServerDHParamsFail)) {
        throw new Error(`Step 2.1 answer was ${serverDhParams}`);
    }
    if (serverDhParams.nonce.neq(resPQ.nonce)) {
        throw new errors_1.SecurityError("Step 2 invalid nonce from server");
    }
    if (serverDhParams.serverNonce.neq(resPQ.serverNonce)) {
        throw new errors_1.SecurityError("Step 2 invalid server nonce from server");
    }
    if (serverDhParams instanceof tl_1.Api.ServerDHParamsFail) {
        const sh = await (0, Helpers_1.sha1)((0, Helpers_1.toSignedLittleBuffer)(newNonce, 32).slice(4, 20));
        const nnh = (0, Helpers_1.readBigIntFromBuffer)(sh, true, true);
        if (serverDhParams.newNonceHash.neq(nnh)) {
            throw new errors_1.SecurityError("Step 2 invalid DH fail nonce from server");
        }
    }
    if (!(serverDhParams instanceof tl_1.Api.ServerDHParamsOk)) {
        throw new Error(`Step 2.2 answer was ${serverDhParams}`);
    }
    log.debug("Finished authKey generation step 2");
    log.debug("Starting authKey generation step 3");
    // Step 3 sending: Complete DH Exchange
    const { key, iv } = await (0, Helpers_1.generateKeyDataFromNonce)(resPQ.serverNonce, newNonce);
    if (serverDhParams.encryptedAnswer.length % 16 !== 0) {
        // See PR#453
        throw new errors_1.SecurityError("Step 3 AES block size mismatch");
    }
    const ige = new IGE_1.IGE(key, iv);
    const plainTextAnswer = ige.decryptIge(serverDhParams.encryptedAnswer);
    const reader = new extensions_1.BinaryReader(plainTextAnswer);
    reader.read(20); // hash sum
    const serverDhInner = reader.tgReadObject();
    if (!(serverDhInner instanceof tl_1.Api.ServerDHInnerData)) {
        throw new Error(`Step 3 answer was ${serverDhInner}`);
    }
    if (serverDhInner.nonce.neq(resPQ.nonce)) {
        throw new errors_1.SecurityError("Step 3 Invalid nonce in encrypted answer");
    }
    if (serverDhInner.serverNonce.neq(resPQ.serverNonce)) {
        throw new errors_1.SecurityError("Step 3 Invalid server nonce in encrypted answer");
    }
    const dhPrime = (0, Helpers_1.readBigIntFromBuffer)(serverDhInner.dhPrime, false, false);
    const ga = (0, Helpers_1.readBigIntFromBuffer)(serverDhInner.gA, false, false);
    const timeOffset = serverDhInner.serverTime - Math.floor(new Date().getTime() / 1000);
    const b = (0, Helpers_1.readBigIntFromBuffer)((0, Helpers_1.generateRandomBytes)(256), false, false);
    const gb = (0, Helpers_1.modExp)((0, big_integer_1.default)(serverDhInner.g), b, dhPrime);
    const gab = (0, Helpers_1.modExp)(ga, b, dhPrime);
    // Prepare client DH Inner Data
    const clientDhInner = new tl_1.Api.ClientDHInnerData({
        nonce: resPQ.nonce,
        serverNonce: resPQ.serverNonce,
        retryId: big_integer_1.default.zero,
        gB: (0, Helpers_1.getByteArray)(gb, false),
    }).getBytes();
    const clientDdhInnerHashed = Buffer.concat([
        await (0, Helpers_1.sha1)(clientDhInner),
        clientDhInner,
    ]);
    // Encryption
    const clientDhEncrypted = ige.encryptIge(clientDdhInnerHashed);
    const dhGen = await sender.send(new tl_1.Api.SetClientDHParams({
        nonce: resPQ.nonce,
        serverNonce: resPQ.serverNonce,
        encryptedData: clientDhEncrypted,
    }));
    const nonceTypes = [tl_1.Api.DhGenOk, tl_1.Api.DhGenRetry, tl_1.Api.DhGenFail];
    // TS being weird again.
    const nonceTypesString = ["DhGenOk", "DhGenRetry", "DhGenFail"];
    if (!(dhGen instanceof nonceTypes[0] ||
        dhGen instanceof nonceTypes[1] ||
        dhGen instanceof nonceTypes[2])) {
        throw new Error(`Step 3.1 answer was ${dhGen}`);
    }
    const { name } = dhGen.constructor;
    if (dhGen.nonce.neq(resPQ.nonce)) {
        throw new errors_1.SecurityError(`Step 3 invalid ${name} nonce from server`);
    }
    if (dhGen.serverNonce.neq(resPQ.serverNonce)) {
        throw new errors_1.SecurityError(`Step 3 invalid ${name} server nonce from server`);
    }
    const authKey = new AuthKey_1.AuthKey();
    await authKey.setKey((0, Helpers_1.getByteArray)(gab));
    const nonceNumber = 1 + nonceTypesString.indexOf(dhGen.className);
    const newNonceHash = await authKey.calcNewNonceHash(newNonce, nonceNumber);
    // @ts-ignore
    const dhHash = dhGen[`newNonceHash${nonceNumber}`];
    if (dhHash.neq(newNonceHash)) {
        throw new errors_1.SecurityError("Step 3 invalid new nonce hash");
    }
    if (!(dhGen instanceof tl_1.Api.DhGenOk)) {
        throw new Error(`Step 3.2 answer was ${dhGen}`);
    }
    log.debug("Finished authKey generation step 3");
    return { authKey, timeOffset };
}
exports.doAuthentication = doAuthentication;
