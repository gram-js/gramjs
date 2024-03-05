export declare class AsyncQueue {
    _queue: any[];
    private canGet;
    private resolveGet;
    private canPush;
    private resolvePush;
    constructor();
    push(value: any): Promise<void>;
    pop(): Promise<any>;
}
