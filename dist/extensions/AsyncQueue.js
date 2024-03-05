"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncQueue = void 0;
class AsyncQueue {
    constructor() {
        this._queue = [];
        this.canPush = true;
        this.resolvePush = (value) => { };
        this.resolveGet = (value) => { };
        this.canGet = new Promise((resolve) => {
            this.resolveGet = resolve;
        });
    }
    async push(value) {
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
exports.AsyncQueue = AsyncQueue;
