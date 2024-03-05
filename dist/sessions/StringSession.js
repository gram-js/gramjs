"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringSession = void 0;
const Memory_1 = require("./Memory");
const extensions_1 = require("../extensions");
const AuthKey_1 = require("../crypto/AuthKey");
const CURRENT_VERSION = "1";
class StringSession extends Memory_1.MemorySession {
    /**
     * This session file can be easily saved and loaded as a string. According
     * to the initial design, it contains only the data that is necessary for
     * successful connection and authentication, so takeout ID is not stored.

     * It is thought to be used where you don't want to create any on-disk
     * files but would still like to be able to save and load existing sessions
     * by other means.

     * You can use custom `encode` and `decode` functions, if present:

     * `encode` definition must be ``function encode(value: Buffer) -> string:``.
     * `decode` definition must be ``function decode(value: string) -> Buffer:``.
     * @param session {string|null}
     */
    constructor(session) {
        super();
        if (session) {
            if (session[0] !== CURRENT_VERSION) {
                throw new Error("Not a valid string");
            }
            session = session.slice(1);
            const r = StringSession.decode(session);
            const reader = new extensions_1.BinaryReader(r);
            this._dcId = reader.read(1).readUInt8(0);
            if (session.length == 352) {
                // Telethon session
                const ip_v4 = reader.read(4);
                // TODO looks ugly smh
                this._serverAddress =
                    ip_v4[0].toString() +
                        "." +
                        ip_v4[1].toString() +
                        "." +
                        ip_v4[2].toString() +
                        "." +
                        ip_v4[3].toString();
            }
            else {
                // TODO find a better of doing this
                const serverAddressLen = reader.read(2).readInt16BE(0);
                if (serverAddressLen > 100) {
                    reader.offset -= 2;
                    this._serverAddress = reader
                        .read(16)
                        .toString("hex")
                        .match(/.{1,4}/g)
                        .map((val) => val.replace(/^0+/, ""))
                        .join(":")
                        .replace(/0000\:/g, ":")
                        .replace(/:{2,}/g, "::");
                }
                else {
                    this._serverAddress = reader
                        .read(serverAddressLen)
                        .toString();
                }
            }
            this._port = reader.read(2).readInt16BE(0);
            this._key = reader.read(-1);
        }
    }
    /**
     * @param x {Buffer}
     * @returns {string}
     */
    static encode(x) {
        return x.toString("base64");
    }
    /**
     * @param x {string}
     * @returns {Buffer}
     */
    static decode(x) {
        return Buffer.from(x, "base64");
    }
    async load() {
        if (this._key) {
            this._authKey = new AuthKey_1.AuthKey();
            await this._authKey.setKey(this._key);
        }
    }
    save() {
        if (!this.authKey || !this.serverAddress || !this.port) {
            return "";
        }
        // TS is weird
        const key = this.authKey.getKey();
        if (!key) {
            return "";
        }
        const dcBuffer = Buffer.from([this.dcId]);
        const addressBuffer = Buffer.from(this.serverAddress);
        const addressLengthBuffer = Buffer.alloc(2);
        addressLengthBuffer.writeInt16BE(addressBuffer.length, 0);
        const portBuffer = Buffer.alloc(2);
        portBuffer.writeInt16BE(this.port, 0);
        return (CURRENT_VERSION +
            StringSession.encode(Buffer.concat([
                dcBuffer,
                addressLengthBuffer,
                addressBuffer,
                portBuffer,
                key,
            ])));
    }
}
exports.StringSession = StringSession;
