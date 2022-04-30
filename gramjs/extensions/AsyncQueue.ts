export class AsyncQueue {
    public _queue: any[];
    private canGet: Promise<unknown>;
    private resolveGet: (value?: any) => void;
    private canPush: boolean | Promise<boolean>;
    private resolvePush: (value?: any) => void;

    constructor() {
        this._queue = [];
        this.canPush = true;
        this.resolvePush = (value) => {};
        this.resolveGet = (value) => {};
        this.canGet = new Promise((resolve) => {
            this.resolveGet = resolve;
        });
    }

    async push(value: any) {
        await this.canPush;
        this._queue.push(value);
        this.resolveGet(true);
        this.canPush = new Promise((resolve) => {
            this.resolvePush = resolve;
        });
    }

    async pop() {
        await this.canGet;
        const returned = this._queue.pop();
        this.resolvePush(true);
        this.canGet = new Promise((resolve) => {
            this.resolveGet = resolve;
        });
        return returned;
    }
}
