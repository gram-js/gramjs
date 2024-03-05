/**
 * Uint32Array -> ArrayBuffer (low-endian os)
 */
export declare function i2abLow(buf: Uint32Array): ArrayBuffer;
/**
 * Uint32Array -> ArrayBuffer (big-endian os)
 */
export declare function i2abBig(buf: Uint32Array): ArrayBuffer;
/**
 * ArrayBuffer -> Uint32Array (low-endian os)
 */
export declare function ab2iLow(ab: ArrayBuffer | SharedArrayBuffer | Uint8Array): Uint32Array;
/**
 * ArrayBuffer -> Uint32Array (big-endian os)
 */
export declare function ab2iBig(ab: ArrayBuffer | SharedArrayBuffer | Uint8Array): Uint32Array;
export declare const isBigEndian: boolean;
export declare const i2ab: typeof i2abBig;
export declare const ab2i: typeof ab2iBig;
