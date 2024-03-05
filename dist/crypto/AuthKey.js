"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthKey = void 0;
const Helpers_1 = require("../Helpers");
const extensions_1 = require("../extensions");
const Helpers_2 = require("../Helpers");
class AuthKey {
    constructor(value, hash) {
        if (!hash || !value) {
            return;
        }
        this._key = value;
        this._hash = hash;
        const reader = new extensions_1.BinaryReader(hash);
        this.auxHash = reader.readLong(false);
        reader.read(4);
        this.keyId = reader.readLong(false);
    }
    async setKey(value) {
        if (!value) {
            this._key = this.auxHash = this.keyId = this._hash = undefined;
            return;
        }
        if (value instanceof AuthKey) {
            this._key = value._key;
            this.auxHash = value.auxHash;
            this.keyId = value.keyId;
            this._hash = value._hash;
            return;
        }
        this._key = value;
        this._hash = await (0, Helpers_1.sha1)(this._key);
        const reader = new extensions_1.BinaryReader(this._hash);
        this.auxHash = reader.readLong(false);
        reader.read(4);
        this.keyId = reader.readLong(false);
    }
    async waitForKey() {
        while (!this.keyId) {
            await (0, Helpers_2.sleep)(20);
        }
    }
    getKey() {
        return this._key;
    }
    // TODO : This doesn't really fit here, it's only used in authentication
    /**
     * Calculates the new nonce hash based on the current class fields' values
     * @param newNonce
     * @param number
     * @returns {bigInt.BigInteger}
     */
    async calcNewNonceHash(newNonce, number) {
        if (this.auxHash) {
            const nonce = (0, Helpers_1.toSignedLittleBuffer)(newNonce, 32);
            const n = Buffer.alloc(1);
            n.writeUInt8(number, 0);
            const data = Buffer.concat([
                nonce,
                Buffer.concat([n, (0, Helpers_1.readBufferFromBigInt)(this.auxHash, 8, true)]),
            ]);
            // Calculates the message key from the given data
            const shaData = (await (0, Helpers_1.sha1)(data)).slice(4, 20);
            return (0, Helpers_1.readBigIntFromBuffer)(shaData, true, true);
        }
        throw new Error("Auth key not set");
    }
    equals(other) {
        var _a;
        return (other instanceof this.constructor &&
            this._key &&
            Buffer.isBuffer(other.getKey()) &&
            ((_a = other.getKey()) === null || _a === void 0 ? void 0 : _a.equals(this._key)));
    }
}
exports.AuthKey = AuthKey;
