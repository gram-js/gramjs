/// <reference types="node" />
import { ProxyInterface } from "../network/connection/TCPMTProxy";
export declare class PromisedNetSockets {
    private client?;
    private closed;
    private stream;
    private canRead?;
    private resolveRead;
    private proxy?;
    constructor(proxy?: ProxyInterface);
    readExactly(number: number): Promise<Buffer>;
    read(number: number): Promise<Buffer>;
    readAll(): Promise<Buffer>;
    /**
     * Creates a new connection
     * @param port
     * @param ip
     * @returns {Promise<void>}
     */
    connect(port: number, ip: string): Promise<unknown>;
    write(data: Buffer): void;
    close(): Promise<void>;
    receive(): Promise<void>;
    toString(): string;
}
