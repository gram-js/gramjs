export declare function s2i(str: string, pos: number): number;
/**
 * Helper function for transforming string key to Uint32Array
 */
export declare function getWords(key: string | Uint8Array | Uint32Array): Uint32Array;
export declare function xor(left: Uint32Array, right: Uint32Array, to?: Uint32Array): void;
