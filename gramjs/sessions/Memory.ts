import {Session} from './Abstract';
import {AuthKey} from "../crypto/AuthKey";
import {Api} from "../tl";
import bigInt from "big-integer";

import {getDisplayName, getInputPeer, getPeerId, isArrayLike} from "../Utils";
import {utils} from "../index";
import {EntityLike} from "../define";

export class MemorySession extends Session {
    protected _serverAddress?: string;
    protected _dcId: number;
    protected _port?: number;
    private _takeoutId: undefined;
    private _entities: Set<any>;
    private _updateStates: {};
    protected _authKey?: AuthKey;

    constructor() {
        super();

        this._serverAddress = undefined;
        this._dcId = 0;
        this._port = undefined;
        this._takeoutId = undefined;

        this._entities = new Set();
        this._updateStates = {}
    }

    setDC(dcId: number, serverAddress: string, port: number) {
        this._dcId = dcId | 0;
        this._serverAddress = serverAddress;
        this._port = port
    }

    get dcId() {
        return this._dcId;
    }

    get serverAddress() {
        return this._serverAddress
    }

    get port() {
        return this._port
    }

    get authKey() {
        return this._authKey;
    }

    set authKey(value) {
        this._authKey = value;
    }

    get takeoutId() {
        return this._takeoutId
    }

    set takeoutId(value) {
        this._takeoutId = value
    }

    /*
        getUpdateState(entityId:number) {
            return this._updateStates[entityId]
        }

        setUpdateState(entityId, state) {
            return this._updateStates[entityId] = state
        }
    */
    close() {
    }

    save() {
    }

    async load() {

    }

    delete() {
    }

    _entityValuesToRow(id: number, hash: bigInt.BigInteger, username: string, phone: string, name: string) {
        // While this is a simple implementation it might be overrode by,
        // other classes so they don't need to implement the plural form
        // of the method. Don't remove.
        return [id, hash, username, phone, name]
    }

    _entityToRow(e: any) {
        if (!(e.classType === "constructor")) {
            return
        }
        let p;
        let markedId;
        try {
            p = getInputPeer(e, false);
            markedId = getPeerId(p)
        } catch (e) {
            return
        }
        let pHash;
        if (p instanceof Api.InputPeerUser || p instanceof Api.InputPeerChannel) {
            pHash = p.accessHash
        } else if (p instanceof Api.InputPeerChat) {
            pHash = bigInt.zero;
        } else {
            return
        }

        let username = e.username;
        if (username) {
            username = username.toLowerCase()
        }
        const phone = e.phone;
        const name = getDisplayName(e);
        return this._entityValuesToRow(markedId, pHash, username, phone, name)
    }

    _entitiesToRows(tlo: any) {
        let entities: any = [];
        if (tlo.classType === "constructor" && isArrayLike(tlo)) {
            // This may be a list of users already for instance
            entities = tlo;
        } else {
            if (tlo instanceof Object) {
                if ('user' in tlo) {
                    entities.push(tlo.user)
                }
                if ('chats' in tlo && isArrayLike(tlo.chats)) {
                    entities.concat(tlo.chats)
                }
                if ('users' in tlo && isArrayLike(tlo.users)) {
                    entities.concat(tlo.users)
                }
            }
        }
        const rows = []; // Rows to add (id, hash, username, phone, name)
        for (const e of entities) {
            const row = this._entityToRow(e);
            if (row) {
                rows.push(row)
            }
        }
        return rows
    }

    processEntities(tlo: any) {
        const entitiesSet = this._entitiesToRows(tlo);
        for (const e of entitiesSet) {
            this._entities.add(e)
        }
    }

    getEntityRowsByPhone(phone: string) {
        for (const e of this._entities) { // id, hash, username, phone, name
            if (e[3] === phone) {
                return [e[0], e[1]]
            }
        }
    }

    getEntityRowsByUsername(username: string) {
        for (const e of this._entities) { // id, hash, username, phone, name
            if (e[2] === username) {
                return [e[0], e[1]]
            }
        }
    }

    getEntityRowsByName(name: string) {
        for (const e of this._entities) { // id, hash, username, phone, name
            if (e[4] === name) {
                return [e[0], e[1]]
            }
        }
    }

    getEntityRowsById(id: number, exact = true) {
        if (exact) {
            for (const e of this._entities) { // id, hash, username, phone, name
                if (e[0] === id) {
                    return [e[0], e[1]]
                }
            }
        } else {
            const ids = [utils.getPeerId(new Api.PeerUser({userId: id})),
                utils.getPeerId(new Api.PeerChat({chatId: id})),
                utils.getPeerId(new Api.PeerChannel({channelId: id})),
            ];
            for (const e of this._entities) { // id, hash, username, phone, name
                if (ids.includes(e[0])) {
                    return [e[0], e[1]]
                }
            }
        }
    }

    getInputEntity(key: EntityLike) {
        let exact;
            if (typeof key === 'object' && key.SUBCLASS_OF_ID) {
                if ([0xc91c90b6, 0xe669bf46, 0x40f202fd].includes(key.SUBCLASS_OF_ID)) {
                    // hex(crc32(b'InputPeer', b'InputUser' and b'InputChannel'))
                    // We already have an Input version, so nothing else required
                    return key
                }
                // Try to early return if this key can be casted as input peer
                return utils.getInputPeer(key)
            } else {
                // Not a TLObject or can't be cast into InputPeer
                if (typeof key === 'object' && key.classType === 'constructor') {
                    key = utils.getPeerId(key);
                    exact = true
                } else {
                    exact = !(typeof key == 'number') || key < 0
                }
            }


        let result = undefined;
        if (typeof key === 'string') {
            const phone = utils.parsePhone(key);
            if (phone) {
                result = this.getEntityRowsByPhone(phone)
            } else {
                const {username, isInvite} = utils.parseUsername(key);
                if (username && !isInvite) {
                    result = this.getEntityRowsByUsername(username)
                } else {
                    const tup = utils.resolveInviteLink(key)[1];
                    if (tup) {
                        result = this.getEntityRowsById(tup, false)
                    }
                }
            }
        } else if (typeof key === 'number') {
            result = this.getEntityRowsById(key, exact)
        }
        if (!result && typeof key === 'string') {
            result = this.getEntityRowsByName(key)
        }

        if (result) {
            let entityId = result[0]; // unpack resulting tuple
            const entityHash = result[1];
            const resolved = utils.resolveId(entityId);
            entityId = resolved[0];
            const kind = resolved[1];
            // removes the mark and returns type of entity
            if (kind === Api.PeerUser) {
                return new Api.InputPeerUser({userId: entityId, accessHash: entityHash})
            } else if (kind === Api.PeerChat) {
                return new Api.InputPeerChat({chatId: entityId})
            } else if (kind === Api.PeerChannel) {
                return new Api.InputPeerChannel({channelId: entityId, accessHash: entityHash})
            }
        } else {
            throw new Error('Could not find input entity with key ' + key)
        }
    }

}

