/// <reference types="node" />
import bigInt from "big-integer";
export declare class AuthKey {
    private _key?;
    private _hash?;
    private auxHash?;
    keyId?: bigInt.BigInteger;
    constructor(value?: Buffer, hash?: Buffer);
    setKey(value?: Buffer | AuthKey): Promise<void>;
    waitForKey(): Promise<void>;
    getKey(): Buffer | undefined;
    /**
     * Calculates the new nonce hash based on the current class fields' values
     * @param newNonce
     * @param number
     * @returns {bigInt.BigInteger}
     */
    calcNewNonceHash(newNonce: bigInt.BigInteger, number: number): Promise<bigInt.BigInteger>;
    equals(other: AuthKey): boolean | undefined;
}
