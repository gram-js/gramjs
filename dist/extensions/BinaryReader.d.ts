/// <reference types="node" />
export declare class BinaryReader {
    private readonly stream;
    private _last?;
    offset: number;
    /**
     * Small utility class to read binary data.
     * @param data {Buffer}
     */
    constructor(data: Buffer);
    /**
     * Reads a single byte value.
     */
    readByte(): number;
    /**
     * Reads an integer (4 bytes or 32 bits) value.
     * @param signed {Boolean}
     */
    readInt(signed?: boolean): number;
    /**
     * Reads a long integer (8 bytes or 64 bits) value.
     * @param signed
     * @returns {BigInteger}
     */
    readLong(signed?: boolean): import("big-integer").BigInteger;
    /**
     * Reads a real floating point (4 bytes) value.
     * @returns {number}
     */
    readFloat(): number;
    /**
     * Reads a real floating point (8 bytes) value.
     * @returns {BigInteger}
     */
    readDouble(): number;
    /**
     * Reads a n-bits long integer value.
     * @param bits
     * @param signed {Boolean}
     */
    readLargeInt(bits: number, signed?: boolean): import("big-integer").BigInteger;
    /**
     * Read the given amount of bytes, or -1 to read all remaining.
     * @param length {number}
     * @param checkLength {boolean} whether to check if the length overflows or not.
     */
    read(length?: number, checkLength?: boolean): Buffer;
    /**
     * Gets the byte array representing the current buffer as a whole.
     * @returns {Buffer}
     */
    getBuffer(): Buffer;
    /**
     * Reads a Telegram-encoded byte array, without the need of
     * specifying its length.
     * @returns {Buffer}
     */
    tgReadBytes(): Buffer;
    /**
     * Reads a Telegram-encoded string.
     * @returns {string}
     */
    tgReadString(): string;
    /**
     * Reads a Telegram boolean value.
     * @returns {boolean}
     */
    tgReadBool(): boolean;
    /**
     * Reads and converts Unix time (used by Telegram)
     * into a Javascript {Date} object.
     * @returns {Date}
     */
    tgReadDate(): Date;
    /**
     * Reads a Telegram object.
     */
    tgReadObject(): any;
    /**
     * Reads a vector (a list) of Telegram objects.
     * @returns {[Buffer]}
     */
    tgReadVector(): any[];
    /**
     * Tells the current position on the stream.
     * @returns {number}
     */
    tellPosition(): number;
    /**
     * Sets the current position on the stream.
     * @param position
     */
    setPosition(position: number): void;
    /**
     * Seeks the stream position given an offset from the current position.
     * The offset may be negative.
     * @param offset
     */
    seek(offset: number): void;
}
