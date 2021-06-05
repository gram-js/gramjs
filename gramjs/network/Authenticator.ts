/**
 * Executes the authentication process with the Telegram servers.
 * @param sender a connected {MTProtoPlainSender}.
 * @param log
 * @returns {Promise<{authKey: *, timeOffset: *}>}
 */
import { Api } from "../tl";
import { SecurityError } from "../errors";
import { Factorizator } from "../crypto/Factorizator";
import { IGE } from "../crypto/IGE";
import { BinaryReader } from "../extensions";
import { AuthKey } from "../crypto/AuthKey";
import { helpers } from "../";
import { encrypt } from "../crypto/RSA";
import bigInt from "big-integer";
import type { MTProtoPlainSender } from "./MTProtoPlainSender";

export async function doAuthentication(sender: MTProtoPlainSender, log: any) {
    // Step 1 sending: PQ Request, endianness doesn't matter since it's random
    let bytes = helpers.generateRandomBytes(16);

    const nonce = helpers.readBigIntFromBuffer(bytes, false, true);
    const resPQ = await sender.send(new Api.ReqPqMulti({ nonce: nonce }));
    log.debug("Starting authKey generation step 1");

    if (!(resPQ instanceof Api.ResPQ)) {
        throw new Error(`Step 1 answer was ${resPQ}`);
    }
    if (resPQ.nonce.neq(nonce)) {
        throw new SecurityError("Step 1 invalid nonce from server");
    }
    const pq = helpers.readBigIntFromBuffer(resPQ.pq, false, true);
    log.debug("Finished authKey generation step 1");
    log.debug("Starting authKey generation step 2");
    // Step 2 sending: DH Exchange
    let { p, q } = Factorizator.factorize(pq);

    const pBuffer = helpers.getByteArray(p);
    const qBuffer = helpers.getByteArray(q);

    bytes = helpers.generateRandomBytes(32);
    const newNonce = helpers.readBigIntFromBuffer(bytes, true, true);
    const pqInnerData = new Api.PQInnerData({
        pq: helpers.getByteArray(pq), // unsigned
        p: pBuffer,
        q: qBuffer,
        nonce: resPQ.nonce,
        serverNonce: resPQ.serverNonce,
        newNonce: newNonce,
    });

    // sha_digest + data + random_bytes
    let cipherText = undefined;
    let targetFingerprint = undefined;
    for (const fingerprint of resPQ.serverPublicKeyFingerprints) {
        cipherText = await encrypt(fingerprint, pqInnerData.getBytes());
        if (cipherText !== undefined) {
            targetFingerprint = fingerprint;
            break;
        }
    }
    if (cipherText === undefined) {
        throw new SecurityError(
            "Step 2 could not find a valid key for fingerprints"
        );
    }
    const serverDhParams = await sender.send(
        new Api.ReqDHParams({
            nonce: resPQ.nonce,
            serverNonce: resPQ.serverNonce,
            p: pBuffer,
            q: qBuffer,
            publicKeyFingerprint: targetFingerprint,
            encryptedData: cipherText,
        })
    );

    if (
        !(
            serverDhParams instanceof Api.ServerDHParamsOk ||
            serverDhParams instanceof Api.ServerDHParamsFail
        )
    ) {
        throw new Error(`Step 2.1 answer was ${serverDhParams}`);
    }
    if (serverDhParams.nonce.neq(resPQ.nonce)) {
        throw new SecurityError("Step 2 invalid nonce from server");
    }

    if (serverDhParams.serverNonce.neq(resPQ.serverNonce)) {
        throw new SecurityError("Step 2 invalid server nonce from server");
    }

    if (serverDhParams instanceof Api.ServerDHParamsFail) {
        const sh = await helpers.sha1(
            helpers.toSignedLittleBuffer(newNonce, 32).slice(4, 20)
        );
        const nnh = helpers.readBigIntFromBuffer(sh, true, true);
        if (serverDhParams.newNonceHash.neq(nnh)) {
            throw new SecurityError("Step 2 invalid DH fail nonce from server");
        }
    }
    if (!(serverDhParams instanceof Api.ServerDHParamsOk)) {
        throw new Error(`Step 2.2 answer was ${serverDhParams}`);
    }
    log.debug("Finished authKey generation step 2");
    log.debug("Starting authKey generation step 3");

    // Step 3 sending: Complete DH Exchange
    const { key, iv } = await helpers.generateKeyDataFromNonce(
        resPQ.serverNonce,
        newNonce
    );
    if (serverDhParams.encryptedAnswer.length % 16 !== 0) {
        // See PR#453
        throw new SecurityError("Step 3 AES block size mismatch");
    }
    const ige = new IGE(key, iv);
    const plainTextAnswer = ige.decryptIge(serverDhParams.encryptedAnswer);
    const reader = new BinaryReader(plainTextAnswer);
    reader.read(20); // hash sum
    const serverDhInner = reader.tgReadObject();
    if (!(serverDhInner instanceof Api.ServerDHInnerData)) {
        throw new Error(`Step 3 answer was ${serverDhInner}`);
    }

    if (serverDhInner.nonce.neq(resPQ.nonce)) {
        throw new SecurityError("Step 3 Invalid nonce in encrypted answer");
    }
    if (serverDhInner.serverNonce.neq(resPQ.serverNonce)) {
        throw new SecurityError(
            "Step 3 Invalid server nonce in encrypted answer"
        );
    }
    const dhPrime = helpers.readBigIntFromBuffer(
        serverDhInner.dhPrime,
        false,
        false
    );
    const ga = helpers.readBigIntFromBuffer(serverDhInner.gA, false, false);
    const timeOffset =
        serverDhInner.serverTime - Math.floor(new Date().getTime() / 1000);
    const b = helpers.readBigIntFromBuffer(
        helpers.generateRandomBytes(256),
        false,
        false
    );
    const gb = helpers.modExp(bigInt(serverDhInner.g), b, dhPrime);
    const gab = helpers.modExp(ga, b, dhPrime);

    // Prepare client DH Inner Data
    const clientDhInner = new Api.ClientDHInnerData({
        nonce: resPQ.nonce,
        serverNonce: resPQ.serverNonce,
        retryId: bigInt.zero, // TODO Actual retry ID
        gB: helpers.getByteArray(gb, false),
    }).getBytes();

    const clientDdhInnerHashed = Buffer.concat([
        await helpers.sha1(clientDhInner),
        clientDhInner,
    ]);
    // Encryption

    const clientDhEncrypted = ige.encryptIge(clientDdhInnerHashed);
    const dhGen = await sender.send(
        new Api.SetClientDHParams({
            nonce: resPQ.nonce,
            serverNonce: resPQ.serverNonce,
            encryptedData: clientDhEncrypted,
        })
    );
    const nonceTypes = [Api.DhGenOk, Api.DhGenRetry, Api.DhGenFail];
    // TS being weird again.
    const nonceTypesString = ["DhGenOk", "DhGenRetry", "DhGenFail"];
    if (
        !(
            dhGen instanceof nonceTypes[0] ||
            dhGen instanceof nonceTypes[1] ||
            dhGen instanceof nonceTypes[2]
        )
    ) {
        throw new Error(`Step 3.1 answer was ${dhGen}`);
    }
    const { name } = dhGen.constructor;
    if (dhGen.nonce.neq(resPQ.nonce)) {
        throw new SecurityError(`Step 3 invalid ${name} nonce from server`);
    }
    if (dhGen.serverNonce.neq(resPQ.serverNonce)) {
        throw new SecurityError(
            `Step 3 invalid ${name} server nonce from server`
        );
    }
    const authKey = new AuthKey();
    await authKey.setKey(helpers.getByteArray(gab));

    const nonceNumber = 1 + nonceTypesString.indexOf(dhGen.className);

    const newNonceHash = await authKey.calcNewNonceHash(newNonce, nonceNumber);
    // @ts-ignore
    const dhHash = dhGen[`newNonceHash${nonceNumber}`];

    if (dhHash.neq(newNonceHash)) {
        throw new SecurityError("Step 3 invalid new nonce hash");
    }

    if (!(dhGen instanceof Api.DhGenOk)) {
        throw new Error(`Step 3.2 answer was ${dhGen}`);
    }
    log.debug("Finished authKey generation step 3");

    return { authKey, timeOffset };
}
