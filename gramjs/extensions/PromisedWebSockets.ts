import { w3cwebsocket } from "websocket";
import { Mutex } from "async-mutex";
import { isBrowser } from "../platform";

const mutex = new Mutex();

const closeError = new Error("WebSocket was closed");

export class PromisedWebSockets {
    private closed: boolean;
    private stream: Buffer;
    private canRead?: boolean | Promise<boolean>;
    private resolveRead: ((value?: any) => void) | undefined;
    private client: w3cwebsocket | undefined;
    private website?: string;

    constructor() {
        this.client = undefined;
        this.stream = Buffer.alloc(0);

        this.closed = true;
    }

    async readExactly(number: number) {
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

    async read(number: number) {
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

    getWebSocketLink(ip: string, port: number, testServers: boolean) {
        if (port === 443) {
            return `wss://${ip}:${port}/apiws${testServers ? "_test" : ""}`;
        } else {
            return `ws://${ip}:${port}/apiws${testServers ? "_test" : ""}`;
        }
    }

    async connect(port: number, ip: string, testServers: boolean = false) {
        this.stream = Buffer.alloc(0);
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve;
        });
        this.closed = false;
        this.website = this.getWebSocketLink(ip, port, testServers);
        this.client = new w3cwebsocket(this.website, "binary");
        return new Promise((resolve, reject) => {
            if (this.client) {
                this.client.onopen = () => {
                    this.receive();
                    resolve(this);
                };
                this.client.onerror = (error: any) => {
                    reject(error);
                };
                this.client.onclose = () => {
                    if (this.resolveRead) {
                        this.resolveRead(false);
                    }
                    this.closed = true;
                };
                //CONTEST
                if (isBrowser) {
                    self.addEventListener("offline", async () => {
                        await this.close();
                        if (this.resolveRead) {
                            this.resolveRead(false);
                        }
                    });
                }
            }
        });
    }

    write(data: Buffer) {
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
            this.client.onmessage = async (message: any) => {
                const release = await mutex.acquire();
                try {
                    let data;
                    //CONTEST BROWSER
                    data = Buffer.from(
                        await new Response(message.data).arrayBuffer()
                    );
                    this.stream = Buffer.concat([this.stream, data]);
                    if (this.resolveRead) {
                        this.resolveRead(true);
                    }
                } finally {
                    release();
                }
            };
        }
    }

    toString() {
        return "PromisedWebSocket";
    }
}
