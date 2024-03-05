"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreSession = void 0;
const Memory_1 = require("./Memory");
const store2_1 = __importDefault(require("store2"));
const AuthKey_1 = require("../crypto/AuthKey");
class StoreSession extends Memory_1.MemorySession {
    constructor(sessionName, divider = ":") {
        super();
        if (typeof localStorage === "undefined" || localStorage === null) {
            const LocalStorage = require("./localStorage").LocalStorage;
            this.store = store2_1.default.area(sessionName, new LocalStorage("./" + sessionName));
        }
        else {
            this.store = store2_1.default.area(sessionName, localStorage);
        }
        if (divider == undefined) {
            divider = ":";
        }
        this.sessionName = sessionName + divider;
    }
    async load() {
        let authKey = this.store.get(this.sessionName + "authKey");
        if (authKey && typeof authKey === "object") {
            this._authKey = new AuthKey_1.AuthKey();
            if ("data" in authKey) {
                authKey = Buffer.from(authKey.data);
            }
            await this._authKey.setKey(authKey);
        }
        const dcId = this.store.get(this.sessionName + "dcId");
        if (dcId) {
            this._dcId = dcId;
        }
        const port = this.store.get(this.sessionName + "port");
        if (port) {
            this._port = port;
        }
        const serverAddress = this.store.get(this.sessionName + "serverAddress");
        if (serverAddress) {
            this._serverAddress = serverAddress;
        }
    }
    setDC(dcId, serverAddress, port) {
        this.store.set(this.sessionName + "dcId", dcId);
        this.store.set(this.sessionName + "port", port);
        this.store.set(this.sessionName + "serverAddress", serverAddress);
        super.setDC(dcId, serverAddress, port);
    }
    set authKey(value) {
        this._authKey = value;
        this.store.set(this.sessionName + "authKey", value === null || value === void 0 ? void 0 : value.getKey());
    }
    get authKey() {
        return this._authKey;
    }
    processEntities(tlo) {
        const rows = this._entitiesToRows(tlo);
        if (!rows) {
            return;
        }
        for (const row of rows) {
            row.push(new Date().getTime().toString());
            this.store.set(this.sessionName + row[0], row);
        }
    }
    getEntityRowsById(id, exact = true) {
        return this.store.get(this.sessionName + id.toString());
    }
}
exports.StoreSession = StoreSession;
