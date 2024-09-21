import { ObfuscatedConnection } from "./Connection";
import { AbridgedPacketCodec } from "./TCPAbridged";
import { generateRandomBytes, sha256 } from "../../Helpers";
import {
    Logger,
    PromisedNetSockets,
    PromisedWebSockets,
} from "../../extensions";
import { CTR } from "../../crypto/CTR";

interface BasicProxyInterface {
    ip: string;
    port: number;
    timeout?: number;
    username?: string;
    password?: string;
}
export type MTProxyType = BasicProxyInterface & {
    secret: string;
    MTProxy: true;
};
export type SocksProxyType = BasicProxyInterface & {
    socksType: 4 | 5;
};

export type ProxyInterface = MTProxyType | SocksProxyType;

class MTProxyIO {
    header?: Buffer = undefined;
    private connection: PromisedNetSockets | PromisedWebSockets;
    private _encrypt?: CTR;
    private _decrypt?: CTR;
    private _packetClass: AbridgedPacketCodec;
    private _secret: Buffer;
    private _dcId: number;

    constructor(connection: TCPMTProxy) {
        this.connection = connection.socket;
        this._packetClass =
            connection.PacketCodecClass as unknown as AbridgedPacketCodec;

        this._secret = connection._secret;
        this._dcId = connection._dcId;
    }

    async initHeader() {
        let secret = this._secret;
        const isDD = secret.length == 17 && secret[0] == 0xdd;
        secret = isDD ? secret.slice(1) : secret;
        if (secret.length != 16) {
            throw new Error(
                "MTProxy secret must be a hex-string representing 16 bytes"
            );
        }
        const keywords = [
            Buffer.from("50567247", "hex"),
            Buffer.from("474554", "hex"),
            Buffer.from("504f5354", "hex"),
            Buffer.from("eeeeeeee", "hex"),
        ];
        let random;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            random = generateRandomBytes(64);
            if (
                random[0] !== 0xef &&
                !random.slice(4, 8).equals(Buffer.alloc(4))
            ) {
                let ok = true;
                for (const key of keywords) {
                    if (key.equals(random.slice(0, 4))) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    break;
                }
            }
        }
        random = random.toJSON().data;
        const randomReversed = Buffer.from(random.slice(8, 56)).reverse();
        // Encryption has "continuous buffer" enabled
        const encryptKey = await sha256(
            Buffer.concat([Buffer.from(random.slice(8, 40)), secret])
        );
        const encryptIv = Buffer.from(random.slice(40, 56));

        const decryptKey = await sha256(
            Buffer.concat([Buffer.from(randomReversed.slice(0, 32)), secret])
        );
        const decryptIv = Buffer.from(randomReversed.slice(32, 48));

        const encryptor = new CTR(encryptKey, encryptIv);
        const decryptor = new CTR(decryptKey, decryptIv);
        random = Buffer.concat([
            Buffer.from(random.slice(0, 56)),
            this._packetClass.obfuscateTag,
            Buffer.from(random.slice(60)),
        ]);
        const dcIdBytes = Buffer.alloc(2);
        dcIdBytes.writeInt8(this._dcId, 0);
        random = Buffer.concat([
            Buffer.from(random.slice(0, 60)),
            dcIdBytes,
            Buffer.from(random.slice(62)),
        ]);
        random = Buffer.concat([
            Buffer.from(random.slice(0, 56)),
            Buffer.from(encryptor.encrypt(random).slice(56, 64)),
            Buffer.from(random.slice(64)),
        ]);
        this.header = random;

        this._encrypt = encryptor;
        this._decrypt = decryptor;
    }

    async read(n: number) {
        const data = await this.connection.readExactly(n);
        return this._decrypt!.encrypt(data);
    }

    write(data: Buffer) {
        this.connection.write(this._encrypt!.encrypt(data));
    }
}

interface TCPMTProxyInterfaceParams {
    ip: string;
    port: number;
    dcId: number;
    loggers: Logger;
    proxy: ProxyInterface;
    socket: typeof PromisedNetSockets | typeof PromisedWebSockets;
    testServers: boolean;
}

export class TCPMTProxy extends ObfuscatedConnection {
    ObfuscatedIO = MTProxyIO;

    _secret: Buffer;

    constructor({
        ip,
        port,
        dcId,
        loggers,
        proxy,
        socket,
        testServers,
    }: TCPMTProxyInterfaceParams) {
        super({
            ip: proxy.ip,
            port: proxy.port,
            dcId: dcId,
            loggers: loggers,
            socket: socket,
            proxy: proxy,
            testServers: testServers,
        });
        if (!("MTProxy" in proxy)) {
            throw new Error("This connection only supports MPTProxies");
        }
        if (!proxy.secret) {
            throw new Error("You need to provide the secret for the MTProxy");
        }
        if (proxy.secret && proxy.secret.match(/^[0-9a-f]+$/i)) {
            // probably hex
            this._secret = Buffer.from(proxy.secret, "hex");
        } else {
            // probably b64
            this._secret = Buffer.from(proxy.secret, "base64");
        }
    }
}

export class ConnectionTCPMTProxyAbridged extends TCPMTProxy {
    PacketCodecClass = AbridgedPacketCodec;
}
