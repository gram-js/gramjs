"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisedNetSockets = void 0;
const net = __importStar(require("./net"));
const socks_1 = require("./socks");
const async_mutex_1 = require("async-mutex");
const mutex = new async_mutex_1.Mutex();
const closeError = new Error("NetSocket was closed");
class PromisedNetSockets {
    constructor(proxy) {
        this.client = undefined;
        this.closed = true;
        this.stream = Buffer.alloc(0);
        if (!(proxy === null || proxy === void 0 ? void 0 : proxy.MTProxy)) {
            // we only want to use this when it's not an MTProto proxy.
            if (proxy) {
                if (!proxy.ip || !proxy.port || !proxy.socksType) {
                    throw new Error(`Invalid sockets params. ${proxy.ip}, ${proxy.port}, ${proxy.socksType}`);
                }
            }
            this.proxy = proxy;
        }
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
    /**
     * Creates a new connection
     * @param port
     * @param ip
     * @returns {Promise<void>}
     */
    async connect(port, ip) {
        this.stream = Buffer.alloc(0);
        let connected = false;
        if (this.proxy) {
            const info = await socks_1.SocksClient.createConnection({
                proxy: {
                    host: this.proxy.ip,
                    port: this.proxy.port,
                    type: this.proxy.socksType != undefined
                        ? this.proxy.socksType
                        : 5,
                    userId: this.proxy.username,
                    password: this.proxy.password,
                },
                command: "connect",
                timeout: (this.proxy.timeout || 5) * 1000,
                destination: {
                    host: ip,
                    port: port,
                },
            });
            this.client = info.socket;
            connected = true;
        }
        else {
            this.client = new net.Socket();
        }
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve;
        });
        this.closed = false;
        return new Promise((resolve, reject) => {
            if (this.client) {
                if (connected) {
                    this.receive();
                    resolve(this);
                }
                else {
                    this.client.connect(port, ip, () => {
                        this.receive();
                        resolve(this);
                    });
                }
                this.client.on("error", reject);
                this.client.on("close", () => {
                    if (this.client && this.client.destroyed) {
                        if (this.resolveRead) {
                            this.resolveRead(false);
                        }
                        this.closed = true;
                    }
                });
            }
        });
    }
    write(data) {
        if (this.closed) {
            throw closeError;
        }
        if (this.client) {
            this.client.write(data);
        }
    }
    async close() {
        if (this.client) {
            await this.client.destroy();
            this.client.unref();
        }
        this.closed = true;
    }
    async receive() {
        if (this.client) {
            this.client.on("data", async (message) => {
                const release = await mutex.acquire();
                try {
                    let data;
                    //CONTEST BROWSER
                    this.stream = Buffer.concat([this.stream, message]);
                    if (this.resolveRead) {
                        this.resolveRead(true);
                    }
                }
                finally {
                    release();
                }
            });
        }
    }
    toString() {
        return "PromisedNetSocket";
    }
}
exports.PromisedNetSockets = PromisedNetSockets;
