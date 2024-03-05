"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHash = exports.pbkdf2Sync = exports.Hash = exports.randomBytes = exports.createCipheriv = exports.createDecipheriv = exports.CTR = exports.Counter = void 0;
const aes_1 = __importDefault(require("@cryptography/aes"));
const converters_1 = require("./converters");
const words_1 = require("./words");
class Counter {
    constructor(initialValue) {
        this._counter = Buffer.from(initialValue);
    }
    increment() {
        for (let i = 15; i >= 0; i--) {
            if (this._counter[i] === 255) {
                this._counter[i] = 0;
            }
            else {
                this._counter[i]++;
                break;
            }
        }
    }
}
exports.Counter = Counter;
class CTR {
    constructor(key, counter) {
        if (!(counter instanceof Counter)) {
            counter = new Counter(counter);
        }
        this._counter = counter;
        this._remainingCounter = undefined;
        this._remainingCounterIndex = 16;
        this._aes = new aes_1.default((0, words_1.getWords)(key));
    }
    update(plainText) {
        return this.encrypt(plainText);
    }
    encrypt(plainText) {
        const encrypted = Buffer.from(plainText);
        for (let i = 0; i < encrypted.length; i++) {
            if (this._remainingCounterIndex === 16) {
                this._remainingCounter = Buffer.from((0, converters_1.i2ab)(this._aes.encrypt((0, converters_1.ab2i)(this._counter._counter))));
                this._remainingCounterIndex = 0;
                this._counter.increment();
            }
            if (this._remainingCounter) {
                encrypted[i] ^=
                    this._remainingCounter[this._remainingCounterIndex++];
            }
        }
        return encrypted;
    }
}
exports.CTR = CTR;
// endregion
function createDecipheriv(algorithm, key, iv) {
    if (algorithm.includes("ECB")) {
        throw new Error("Not supported");
    }
    else {
        return new CTR(key, iv);
    }
}
exports.createDecipheriv = createDecipheriv;
function createCipheriv(algorithm, key, iv) {
    if (algorithm.includes("ECB")) {
        throw new Error("Not supported");
    }
    else {
        return new CTR(key, iv);
    }
}
exports.createCipheriv = createCipheriv;
function randomBytes(count) {
    const bytes = new Uint8Array(count);
    crypto.getRandomValues(bytes);
    return bytes;
}
exports.randomBytes = randomBytes;
class Hash {
    constructor(algorithm) {
        this.algorithm = algorithm;
    }
    update(data) {
        //We shouldn't be needing new Uint8Array but it doesn't
        //work without it
        this.data = new Uint8Array(data);
    }
    async digest() {
        if (this.data) {
            if (this.algorithm === "sha1") {
                return Buffer.from(await self.crypto.subtle.digest("SHA-1", this.data));
            }
            else if (this.algorithm === "sha256") {
                return Buffer.from(await self.crypto.subtle.digest("SHA-256", this.data));
            }
        }
        return Buffer.alloc(0);
    }
}
exports.Hash = Hash;
async function pbkdf2Sync(password, salt, iterations, ...args) {
    const passwordKey = await crypto.subtle.importKey("raw", password, { name: "PBKDF2" }, false, ["deriveBits"]);
    return Buffer.from(await crypto.subtle.deriveBits({
        name: "PBKDF2",
        hash: "SHA-512",
        salt,
        iterations,
    }, passwordKey, 512));
}
exports.pbkdf2Sync = pbkdf2Sync;
function createHash(algorithm) {
    return new Hash(algorithm);
}
exports.createHash = createHash;
