/// <reference types="node" />
import { Connection, PacketCodec } from "./Connection";
import type { PromisedNetSockets, PromisedWebSockets } from "../../extensions";
export declare class FullPacketCodec extends PacketCodec {
    private _sendCounter;
    constructor(connection: any);
    encodePacket(data: Buffer): Buffer;
    /**
     *
     * @param reader {PromisedWebSockets}
     * @returns {Promise<*>}
     */
    readPacket(reader: PromisedNetSockets | PromisedWebSockets): Promise<Buffer>;
}
export declare class ConnectionTCPFull extends Connection {
    PacketCodecClass: typeof FullPacketCodec;
}
