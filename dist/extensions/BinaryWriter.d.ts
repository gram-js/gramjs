/// <reference types="node" />
export declare class BinaryWriter {
    private readonly _buffers;
    constructor(stream: Buffer);
    write(buffer: Buffer): void;
    getValue(): Buffer;
}
