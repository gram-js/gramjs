import type { BinaryReader } from "../../extensions";
export declare class MessageContainer {
    static CONSTRUCTOR_ID: number;
    static classType: string;
    static MAXIMUM_SIZE: number;
    static MAXIMUM_LENGTH: number;
    private CONSTRUCTOR_ID;
    private messages;
    private classType;
    constructor(messages: any[]);
    static fromReader(reader: BinaryReader): Promise<MessageContainer>;
}
