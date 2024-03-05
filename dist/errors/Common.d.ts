/**
 * Errors not related to the Telegram API itself
 */
/// <reference types="node" />
import { Api } from "../tl";
/**
 * Occurs when a read operation was cancelled.
 */
export declare class ReadCancelledError extends Error {
    constructor();
}
/**
 * Occurs when a type is not found, for example,
 * when trying to read a TLObject with an invalid constructor code.
 */
export declare class TypeNotFoundError extends Error {
    invalidConstructorId: number;
    remaining: Buffer;
    constructor(invalidConstructorId: number, remaining: Buffer);
}
/**
 * Occurs when using the TCP full mode and the checksum of a received
 * packet doesn't match the expected checksum.
 */
export declare class InvalidChecksumError extends Error {
    private checksum;
    private validChecksum;
    constructor(checksum: number, validChecksum: number);
}
/**
 * Occurs when the buffer is invalid, and may contain an HTTP error code.
 * For instance, 404 means "forgotten/broken authorization key", while
 */
export declare class InvalidBufferError extends Error {
    code?: number;
    payload: Buffer;
    constructor(payload: Buffer);
}
/**
 * Generic security error, mostly used when generating a new AuthKey.
 */
export declare class SecurityError extends Error {
    constructor(...args: any[]);
}
/**
 * Occurs when there's a hash mismatch between the decrypted CDN file
 * and its expected hash.
 */
export declare class CdnFileTamperedError extends SecurityError {
    constructor();
}
/**
 * Occurs when handling a badMessageNotification
 */
export declare class BadMessageError extends Error {
    static ErrorMessages: {
        16: string;
        17: string;
        18: string;
        19: string;
        20: string;
        32: string;
        33: string;
        34: string;
        35: string;
        48: string;
        64: string;
    };
    private code;
    private errorMessage;
    constructor(request: Api.AnyRequest, code: number);
}
