"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySession = void 0;
const Abstract_1 = require("./Abstract");
const tl_1 = require("../tl");
const big_integer_1 = __importDefault(require("big-integer"));
const Utils_1 = require("../Utils");
const Helpers_1 = require("../Helpers");
const __1 = require("../");
class MemorySession extends Abstract_1.Session {
    constructor() {
        super();
        this._serverAddress = undefined;
        this._dcId = 0;
        this._port = undefined;
        this._takeoutId = undefined;
        this._entities = new Set();
        this._updateStates = {};
    }
    setDC(dcId, serverAddress, port) {
        this._dcId = dcId | 0;
        this._serverAddress = serverAddress;
        this._port = port;
    }
    get dcId() {
        return this._dcId;
    }
    get serverAddress() {
        return this._serverAddress;
    }
    get port() {
        return this._port;
    }
    get authKey() {
        return this._authKey;
    }
    set authKey(value) {
        this._authKey = value;
    }
    get takeoutId() {
        return this._takeoutId;
    }
    set takeoutId(value) {
        this._takeoutId = value;
    }
    getAuthKey(dcId) {
        if (dcId && dcId !== this.dcId) {
            // Not supported.
            return undefined;
        }
        return this.authKey;
    }
    setAuthKey(authKey, dcId) {
        if (dcId && dcId !== this.dcId) {
            // Not supported.
            return undefined;
        }
        this.authKey = authKey;
    }
    close() { }
    save() { }
    async load() { }
    delete() { }
    _entityValuesToRow(id, hash, username, phone, name) {
        // While this is a simple implementation it might be overrode by,
        // other classes so they don't need to implement the plural form
        // of the method. Don't remove.
        return [id, hash, username, phone, name];
    }
    _entityToRow(e) {
        if (!(e.classType === "constructor")) {
            return;
        }
        let p;
        let markedId;
        try {
            p = (0, Utils_1.getInputPeer)(e, false);
            markedId = (0, Utils_1.getPeerId)(p);
        }
        catch (e) {
            return;
        }
        let pHash;
        if (p instanceof tl_1.Api.InputPeerUser ||
            p instanceof tl_1.Api.InputPeerChannel) {
            pHash = p.accessHash;
        }
        else if (p instanceof tl_1.Api.InputPeerChat) {
            pHash = big_integer_1.default.zero;
        }
        else {
            return;
        }
        let username = e.username;
        if (username) {
            username = username.toLowerCase();
        }
        const phone = e.phone;
        const name = (0, Utils_1.getDisplayName)(e);
        return this._entityValuesToRow(markedId, pHash, username, phone, name);
    }
    _entitiesToRows(tlo) {
        let entities = [];
        if (!(tlo.classType === "constructor") && (0, Helpers_1.isArrayLike)(tlo)) {
            // This may be a list of users already for instance
            entities = tlo;
        }
        else {
            if (typeof tlo === "object") {
                if ("user" in tlo) {
                    entities.push(tlo.user);
                }
                if ("chat" in tlo) {
                    entities.push(tlo.chat);
                }
                if ("channel" in tlo) {
                    entities.push(tlo.channel);
                }
                if ("chats" in tlo && (0, Helpers_1.isArrayLike)(tlo.chats)) {
                    entities = entities.concat(tlo.chats);
                }
                if ("users" in tlo && (0, Helpers_1.isArrayLike)(tlo.users)) {
                    entities = entities.concat(tlo.users);
                }
            }
        }
        const rows = []; // Rows to add (id, hash, username, phone, name)
        for (const e of entities) {
            const row = this._entityToRow(e);
            if (row) {
                rows.push(row);
            }
        }
        return rows;
    }
    processEntities(tlo) {
        const entitiesSet = this._entitiesToRows(tlo);
        for (const e of entitiesSet) {
            this._entities.add(e);
        }
    }
    getEntityRowsByPhone(phone) {
        for (const e of this._entities) {
            // id, hash, username, phone, name
            if (e[3] === phone) {
                return [e[0], e[1]];
            }
        }
    }
    getEntityRowsByUsername(username) {
        for (const e of this._entities) {
            // id, hash, username, phone, name
            if (e[2] === username) {
                return [e[0], e[1]];
            }
        }
    }
    getEntityRowsByName(name) {
        for (const e of this._entities) {
            // id, hash, username, phone, name
            if (e[4] === name) {
                return [e[0], e[1]];
            }
        }
    }
    getEntityRowsById(id, exact = true) {
        if (exact) {
            for (const e of this._entities) {
                // id, hash, username, phone, name
                if (e[0] === id) {
                    return [e[0], e[1]];
                }
            }
        }
        else {
            const ids = [
                __1.utils.getPeerId(new tl_1.Api.PeerUser({ userId: (0, Helpers_1.returnBigInt)(id) })),
                __1.utils.getPeerId(new tl_1.Api.PeerChat({ chatId: (0, Helpers_1.returnBigInt)(id) })),
                __1.utils.getPeerId(new tl_1.Api.PeerChannel({ channelId: (0, Helpers_1.returnBigInt)(id) })),
            ];
            for (const e of this._entities) {
                // id, hash, username, phone, name
                if (ids.includes(e[0])) {
                    return [e[0], e[1]];
                }
            }
        }
    }
    getInputEntity(key) {
        let exact;
        if (typeof key === "object" &&
            !big_integer_1.default.isInstance(key) &&
            key.SUBCLASS_OF_ID) {
            if (key.SUBCLASS_OF_ID == 0xc91c90b6 ||
                key.SUBCLASS_OF_ID == 0xe669bf46 ||
                key.SUBCLASS_OF_ID == 0x40f202fd) {
                // @ts-ignore
                return key;
            }
            // Try to early return if this key can be casted as input peer
            return __1.utils.getInputPeer(key);
        }
        else {
            // Not a TLObject or can't be cast into InputPeer
            if (typeof key === "object") {
                key = __1.utils.getPeerId(key);
                exact = true;
            }
            else {
                exact = false;
            }
        }
        if (big_integer_1.default.isInstance(key) ||
            typeof key == "bigint" ||
            typeof key == "number") {
            key = key.toString();
        }
        let result = undefined;
        if (typeof key === "string") {
            const phone = __1.utils.parsePhone(key);
            if (phone) {
                result = this.getEntityRowsByPhone(phone);
            }
            else {
                const { username, isInvite } = __1.utils.parseUsername(key);
                if (username && !isInvite) {
                    result = this.getEntityRowsByUsername(username);
                }
            }
            if (!result) {
                const id = __1.utils.parseID(key);
                if (id) {
                    result = this.getEntityRowsById(id, exact);
                }
            }
            if (!result) {
                result = this.getEntityRowsByName(key);
            }
        }
        if (result) {
            let entityId = result[0]; // unpack resulting tuple
            const entityHash = (0, big_integer_1.default)(result[1]);
            const resolved = __1.utils.resolveId((0, Helpers_1.returnBigInt)(entityId));
            entityId = resolved[0];
            const kind = resolved[1];
            // removes the mark and returns type of entity
            if (kind === tl_1.Api.PeerUser) {
                return new tl_1.Api.InputPeerUser({
                    userId: entityId,
                    accessHash: entityHash,
                });
            }
            else if (kind === tl_1.Api.PeerChat) {
                return new tl_1.Api.InputPeerChat({ chatId: entityId });
            }
            else if (kind === tl_1.Api.PeerChannel) {
                return new tl_1.Api.InputPeerChannel({
                    channelId: entityId,
                    accessHash: entityHash,
                });
            }
        }
        else {
            throw new Error("Could not find input entity with key " + key);
        }
        throw new Error("Could not find input entity with key " + key);
    }
}
exports.MemorySession = MemorySession;
