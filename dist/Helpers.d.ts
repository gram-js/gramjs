/// <reference types="node" />
import bigInt from "big-integer";
import type { EntityLike } from "./define";
import type { Api } from "./tl";
/**
 * converts a buffer to big int
 * @param buffer
 * @param little
 * @param signed
 * @returns {bigInt.BigInteger}
 */
export declare function readBigIntFromBuffer(buffer: Buffer, little?: boolean, signed?: boolean): bigInt.BigInteger;
export declare function generateRandomBigInt(): bigInt.BigInteger;
export declare function escapeRegex(string: string): string;
export declare function groupBy(list: any[], keyGetter: Function): Map<any, any>;
/**
 * Outputs the object in a better way by hiding all the private methods/attributes.
 * @param object - the class to use
 */
export declare function betterConsoleLog(object: {
    [key: string]: any;
}): {
    [key: string]: any;
};
/**
 * Helper to find if a given object is an array (or similar)
 */
export declare const isArrayLike: <T>(x: any) => x is T[];
/**
 * Special case signed little ints
 * @param big
 * @param number
 * @returns {Buffer}
 */
export declare function toSignedLittleBuffer(big: bigInt.BigInteger | string | number, number?: number): Buffer;
/**
 * converts a big int to a buffer
 * @param bigIntVar {BigInteger}
 * @param bytesNumber
 * @param little
 * @param signed
 * @returns {Buffer}
 */
export declare function readBufferFromBigInt(bigIntVar: bigInt.BigInteger, bytesNumber: number, little?: boolean, signed?: boolean): Buffer;
/**
 * Generates a random long integer (8 bytes), which is optionally signed
 * @returns {BigInteger}
 */
export declare function generateRandomLong(signed?: boolean): bigInt.BigInteger;
/**
 * .... really javascript
 * @param n {number}
 * @param m {number}
 * @returns {number}
 */
export declare function mod(n: number, m: number): number;
/**
 * returns a positive bigInt
 * @param n {bigInt.BigInteger}
 * @param m {bigInt.BigInteger}
 * @returns {bigInt.BigInteger}
 */
export declare function bigIntMod(n: bigInt.BigInteger, m: bigInt.BigInteger): bigInt.BigInteger;
/**
 * Generates a random bytes array
 * @param count
 * @returns {Buffer}
 */
export declare function generateRandomBytes(count: number): Buffer;
/**
 * Calculate the key based on Telegram guidelines, specifying whether it's the client or not
 * @param sharedKey
 * @param msgKey
 * @param client
 * @returns {{iv: Buffer, key: Buffer}}
 */
export declare function stripText(text: string, entities: Api.TypeMessageEntity[]): string;
/**
 * Generates the key data corresponding to the given nonces
 * @param serverNonceBigInt
 * @param newNonceBigInt
 * @returns {{key: Buffer, iv: Buffer}}
 */
export declare function generateKeyDataFromNonce(serverNonceBigInt: bigInt.BigInteger, newNonceBigInt: bigInt.BigInteger): Promise<{
    key: Buffer;
    iv: Buffer;
}>;
export declare function convertToLittle(buf: Buffer): Buffer;
/**
 * Calculates the SHA1 digest for the given data
 * @param data
 * @returns {Promise}
 */
export declare function sha1(data: Buffer): Promise<Buffer>;
/**
 * Calculates the SHA256 digest for the given data
 * @param data
 * @returns {Promise}
 */
export declare function sha256(data: Buffer): Promise<Buffer>;
/**
 * Fast mod pow for RSA calculation. a^b % n
 * @param a
 * @param b
 * @param n
 * @returns {bigInt.BigInteger}
 */
export declare function modExp(a: bigInt.BigInteger, b: bigInt.BigInteger, n: bigInt.BigInteger): bigInt.BigInteger;
/**
 * Gets the arbitrary-length byte array corresponding to the given integer
 * @param integer {number,BigInteger}
 * @param signed {boolean}
 * @returns {Buffer}
 */
export declare function getByteArray(integer: bigInt.BigInteger | number, signed?: boolean): Buffer;
export declare function returnBigInt(num: bigInt.BigInteger | string | number | bigint): bigInt.BigInteger;
/**
 * Helper function to return the smaller big int in an array
 * @param arrayOfBigInts
 */
export declare function getMinBigInt(arrayOfBigInts: (bigInt.BigInteger | string)[]): bigInt.BigInteger;
/**
 * returns a random int from min (inclusive) and max (inclusive)
 * @param min
 * @param max
 * @returns {number}
 */
export declare function getRandomInt(min: number, max: number): number;
/**
 * Sleeps a specified amount of time
 * @param ms time in milliseconds
 * @param isUnref make a timer unref'ed
 * @returns {Promise}
 */
export declare const sleep: (ms: number, isUnref?: boolean) => Promise<unknown>;
/**
 * Helper to export two buffers of same length
 * @returns {Buffer}
 */
export declare function bufferXor(a: Buffer, b: Buffer): Buffer;
export declare function crc32(buf: Buffer | string): number;
export declare class TotalList<T> extends Array<T> {
    total?: number;
    constructor();
}
export declare const _EntityType: {
    USER: number;
    CHAT: number;
    CHANNEL: number;
};
export declare function _entityType(entity: EntityLike): number;
