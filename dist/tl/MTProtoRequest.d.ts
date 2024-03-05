/// <reference types="node" />
export declare class MTProtoRequest {
    private sent;
    private sequence;
    private msgId;
    private readonly dirty;
    private sendTime;
    private confirmReceived;
    private constructorId;
    private readonly confirmed;
    private responded;
    constructor();
    onSendSuccess(): void;
    onConfirm(): void;
    needResend(): boolean;
    onSend(): void;
    onResponse(buffer: Buffer): void;
    onException(exception: Error): void;
}
