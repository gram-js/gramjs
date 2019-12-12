const MemorySession = require('./Memory')
const AuthKey = require('../crypto/AuthKey')
const utils = require('../Utils')

const STORAGE_KEY_BASE = 'GramJs:session:'

class LocalStorageSession extends MemorySession {
    constructor(sessionId) {
        super()
        this._storageKey = null
        this._authKeys = {}

        if (sessionId) {
            try {
                const json = localStorage.getItem(sessionId)
                const { mainDcId, keys, hashes } = JSON.parse(json)
                const { ipAddress, port } = utils.getDC(mainDcId)

                this.setDC(mainDcId, ipAddress, port)

                Object.keys(keys).forEach((dcId) => {
                    this._authKeys[dcId] = new AuthKey(
                        Buffer.from(keys[dcId].data),
                        Buffer.from(hashes[dcId].data)
                    )
                })

                this._storageKey = sessionId
            } catch (err) {
                throw new Error(`Failed to retrieve or parse JSON from Local Storage for key ${sessionId}`)
            }
        }
    }

    setDC(dcId, serverAddress, port) {
        this._dcId = dcId
        this._serverAddress = serverAddress
        this._port = port

        if (this._storageKey) {
            this._save()
        }

        delete this._authKeys[dcId]

        this._updateStorage()
    }

    save() {
        if (!this._storageKey) {
            this._storageKey = generateStorageKey()
        }

        this._updateStorage()

        return this._storageKey
    }

    _updateStorage() {
        if (!this._storageKey) {
            return;
        }

        const sessionData = {
            mainDcId: this._dcId,
            keys: {},
            hashes: {}
        }

        Object.keys(this._authKeys).map((dcId) => {
            const authKey = this._authKeys[dcId]
            sessionData.keys[dcId] = authKey._key
            sessionData.hashes[dcId] = authKey._hash
        })

        localStorage.setItem(this._storageKey, JSON.stringify(sessionData))
    }

    get authKey() {
        throw new Error('Not supported')
    }

    set authKey(value) {
        throw new Error('Not supported')
    }

    getAuthKey(dcId = this._dcId) {
        return this._authKeys[dcId]
    }

    setAuthKey(authKey, dcId = this._dcId) {
        this._authKeys[dcId] = authKey

        this._updateStorage()
    }
}

function generateStorageKey() {
    // Creating two sessions at the same moment is not expected nor supported.
    return `${STORAGE_KEY_BASE}${Date.now()}`
}

module.exports = LocalStorageSession
