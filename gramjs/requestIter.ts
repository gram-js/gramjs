import type {TelegramClient} from "./client/TelegramClient";
import {sleep} from './Helpers';
import {helpers} from "./";

interface BaseRequestIterInterface {
    reverse?: boolean,
    waitTime?: number,
}

export class RequestIter implements AsyncIterable<any> {

    public client: TelegramClient;
    public reverse: boolean | undefined;
    public waitTime: number | undefined;
    protected readonly limit: number;
    protected left: number;
    protected buffer: Array<any> | undefined;
    private index: number;
    protected total: number | undefined;
    private lastLoad: number;
    kwargs: {};

    [key: string]: any;

    constructor(client: TelegramClient, limit: number, params: BaseRequestIterInterface = {}, args = {}) {
        this.client = client;
        this.reverse = params.reverse;
        this.waitTime = params.waitTime;
        this.limit = Math.max(!limit ? Number.MAX_SAFE_INTEGER : limit, 0);
        this.left = this.limit;
        this.buffer = undefined;
        this.kwargs = args;
        this.index = 0;
        this.total = undefined;
        this.lastLoad = 0
    }


    async _init(kwargs: any): Promise<boolean | void> {
        // for overload
    }

    [Symbol.asyncIterator](): AsyncIterator<any, any, undefined> {
        this.buffer = undefined;
        this.index = 0;
        this.lastLoad = 0;
        this.left = this.limit;
        return {
            next: async () => {

                if (this.buffer == undefined) {
                    this.buffer = [];
                    if (await this._init(this.kwargs)) {
                        this.left = this.buffer.length;
                    }
                }
                if (this.left <= 0) {
                    return {
                        value: undefined,
                        done: true,
                    };
                }
                if (this.index == this.buffer.length) {
                    if (this.waitTime) {
                        await sleep(this.waitTime - ((new Date().getTime() / 1000) - this.lastLoad));
                    }
                    this.lastLoad = new Date().getTime() / 1000;
                    this.index = 0;
                    this.buffer = [];
                    const nextChunk = await this._loadNextChunk();
                    if (nextChunk === false) {
                        // we exit;
                        return {
                            value: undefined,
                            done: true,
                        };
                    }
                    if (nextChunk) {
                        this.left = this.buffer.length;
                    }
                }

                if (!this.buffer || !this.buffer.length) {
                    return {
                        value: undefined,
                        done: true,
                    };
                }
                const result = this.buffer[this.index];
                this.left -= 1;
                this.index += 1;
                return {
                    value: result,
                    done: false,
                };
            }
        }
    }

    async collect() {
        const result = new helpers.TotalList();
        for await (const message of this) {
            result.push(message);
        }
        result.total = this.total;
        return result;
    }

    async _loadNextChunk(): Promise<boolean | undefined> {
        throw new Error("Not Implemented");
    }

}

