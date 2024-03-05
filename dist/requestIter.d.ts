import type { TelegramClient } from "./client/TelegramClient";
import { helpers } from "./";
interface BaseRequestIterInterface {
    reverse?: boolean;
    waitTime?: number;
}
export declare class RequestIter implements AsyncIterable<any> {
    client: TelegramClient;
    reverse: boolean | undefined;
    waitTime: number | undefined;
    protected readonly limit: number;
    protected left: number;
    protected buffer: Array<any> | undefined;
    private index;
    protected total: number | undefined;
    private lastLoad;
    kwargs: {};
    constructor(client: TelegramClient, limit?: number, params?: BaseRequestIterInterface, args?: {});
    _init(kwargs: any): Promise<boolean | void>;
    [Symbol.asyncIterator](): AsyncIterator<any, any, undefined>;
    collect(): Promise<helpers.TotalList<unknown>>;
    _loadNextChunk(): Promise<boolean | undefined>;
}
export {};
