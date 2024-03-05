/// <reference types="node" />
export declare class BinaryWriter {
    private _stream;
    constructor(stream: Buffer);
    write(buffer: Buffer): void;
    getValue(): Buffer;
}
