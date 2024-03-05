/// <reference types="node" />
import bigInt from "big-integer";
export declare const _serverKeys: Map<string, {
    n: bigInt.BigInteger;
    e: number;
}>;
/**
 * Encrypts the given data known the fingerprint to be used
 * in the way Telegram requires us to do so (sha1(data) + data + padding)

 * @param fingerprint the fingerprint of the RSA key.
 * @param data the data to be encrypted.
 * @returns {Buffer|*|undefined} the cipher text, or undefined if no key matching this fingerprint is found.
 */
export declare function encrypt(fingerprint: bigInt.BigInteger, data: Buffer): Promise<Buffer | undefined>;
