/// <reference types="node" />
import { MemorySession } from "./Memory";
export declare class StringSession extends MemorySession {
    _key?: Buffer;
    /**
     * This session file can be easily saved and loaded as a string. According
     * to the initial design, it contains only the data that is necessary for
     * successful connection and authentication, so takeout ID is not stored.

     * It is thought to be used where you don't want to create any on-disk
     * files but would still like to be able to save and load existing sessions
     * by other means.

     * You can use custom `encode` and `decode` functions, if present:

     * `encode` definition must be ``function encode(value: Buffer) -> string:``.
     * `decode` definition must be ``function decode(value: string) -> Buffer:``.
     * @param session {string|null}
     */
    constructor(session?: string);
    /**
     * @param x {Buffer}
     * @returns {string}
     */
    static encode(x: Buffer): string;
    /**
     * @param x {string}
     * @returns {Buffer}
     */
    static decode(x: string): Buffer;
    load(): Promise<void>;
    save(): string;
}
