"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisedWebSockets = void 0;
const websocket_1 = require("websocket");
const async_mutex_1 = require("async-mutex");
const platform_1 = require("../platform");
const mutex = new async_mutex_1.Mutex();
const closeError = new Error("WebSocket was closed");
class PromisedWebSockets {
    constructor() {
        this.client = undefined;
        this.stream = Buffer.alloc(0);
        this.closed = true;
    }
    async readExactly(number) {
        let readData = Buffer.alloc(0);
        while (true) {
            const thisTime = await this.read(number);
            readData = Buffer.concat([readData, thisTime]);
            number = number - thisTime.length;
            if (!number) {
                return readData;
            }
        }
    }
    async read(number) {
        if (this.closed) {
            throw closeError;
        }
        await this.canRead;
        if (this.closed) {
            throw closeError;
        }
        const toReturn = this.stream.slice(0, number);
        this.stream = this.stream.slice(number);
        if (this.stream.length === 0) {
            this.canRead = new Promise((resolve) => {
                this.resolveRead = resolve;
            });
        }
        return toReturn;
    }
    async readAll() {
        if (this.closed || !(await this.canRead)) {
            throw closeError;
        }
        const toReturn = this.stream;
        this.stream = Buffer.alloc(0);
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve;
        });
        return toReturn;
    }
    getWebSocketLink(ip, port, testServers) {
        if (port === 443) {
            return `wss://${ip}:${port}/apiws${testServers ? "_test" : ""}`;
        }
        else {
            return `ws://${ip}:${port}/apiws${testServers ? "_test" : ""}`;
        }
    }
    async connect(port, ip, testServers = false) {
        this.stream = Buffer.alloc(0);
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve;
        });
        this.closed = false;
        this.website = this.getWebSocketLink(ip, port, testServers);
        this.client = new websocket_1.w3cwebsocket(this.website, "binary");
        return new Promise((resolve, reject) => {
            if (this.client) {
                this.client.onopen = () => {
                    this.receive();
                    resolve(this);
                };
                this.client.onerror = (error) => {
                    reject(error);
                };
                this.client.onclose = () => {
                    if (this.resolveRead) {
                        this.resolveRead(false);
                    }
                    this.closed = true;
                };
                //CONTEST
                if (platform_1.isBrowser) {
                    window.addEventListener("offline", async () => {
                        await this.close();
                        if (this.resolveRead) {
                            this.resolveRead(false);
                        }
                    });
                }
            }
        });
    }
    write(data) {
        if (this.closed) {
            throw closeError;
        }
        if (this.client) {
            this.client.send(data);
        }
    }
    async close() {
        if (this.client) {
            await this.client.close();
        }
        this.closed = true;
    }
    async receive() {
        if (this.client) {
            this.client.onmessage = async (message) => {
                const release = await mutex.acquire();
                try {
                    let data;
                    //CONTEST BROWSER
                    data = Buffer.from(await new Response(message.data).arrayBuffer());
                    this.stream = Buffer.concat([this.stream, data]);
                    if (this.resolveRead) {
                        this.resolveRead(true);
                    }
                }
                finally {
                    release();
                }
            };
        }
    }
    toString() {
        return "PromisedWebSocket";
    }
}
exports.PromisedWebSockets = PromisedWebSockets;
