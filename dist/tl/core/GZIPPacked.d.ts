/// <reference types="node" />
import type { BinaryReader } from "../../extensions";
export declare class GZIPPacked {
    static CONSTRUCTOR_ID: number;
    static classType: string;
    data: Buffer;
    private CONSTRUCTOR_ID;
    private classType;
    constructor(data: Buffer);
    static gzipIfSmaller(contentRelated: boolean, data: Buffer): Promise<Buffer>;
    static gzip(input: Buffer): Buffer;
    static ungzip(input: Buffer): Buffer;
    toBytes(): Promise<Buffer>;
    static read(reader: BinaryReader): Promise<Buffer>;
    static fromReader(reader: BinaryReader): Promise<GZIPPacked>;
}
