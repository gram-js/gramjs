/// <reference types="node" />
export declare class PromisedWebSockets {
    private closed;
    private stream;
    private canRead?;
    private resolveRead;
    private client;
    private website?;
    constructor();
    readExactly(number: number): Promise<Buffer>;
    read(number: number): Promise<Buffer>;
    readAll(): Promise<Buffer>;
    getWebSocketLink(ip: string, port: number, testServers: boolean): string;
    connect(port: number, ip: string, testServers?: boolean): Promise<unknown>;
    write(data: Buffer): void;
    close(): Promise<void>;
    receive(): Promise<void>;
    toString(): string;
}
