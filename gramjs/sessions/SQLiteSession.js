const EXTENSION = '.session'
const CURRENT_VERSION = 1
const AuthKey = require('../crypto/AuthKey')
const Database = require('better-sqlite3')
const utils = require('../Utils')
const { PeerUser, PeerChannel, PeerChat } = require('../tl/types')
const types = require('../tl/types')
const fs = require('fs')
const MemorySession = require('./Memory')

class SQLiteSession extends MemorySession {
    /**
     * This session contains the required information to login into your
     * Telegram account. NEVER give the saved session file to anyone, since
     * they would gain instant access to all your messages and contacts.

     * If you think the session has been compromised, close all the sessions
     * through an official Telegram client to revoke the authorization.
     */
    constructor(sessionId = null) {
        super()
        this.filename = ':memory:'
        this.saveEntities = true

        if (sessionId) {
            this.filename = sessionId
            if (!this.filename.endsWith(EXTENSION)) {
                this.filename += EXTENSION
            }
        }

        this.db = new Database(this.filename)
        let stmt = this.db.prepare('SELECT name FROM sqlite_master where type=\'table\' and name=\'version\'')
        if (stmt.get()) {
            // Tables already exist, check for the version
            stmt = this.db.prepare('select version from version')
            const version = stmt.get().version
            if (version < CURRENT_VERSION) {
                this._upgradeDatabase(version)
                this.db.exec('delete from version')
                stmt = this.db.prepare('insert into version values (?)')
                stmt.run(CURRENT_VERSION)
                this.save()
            }

            // These values will be saved
            stmt = this.db.prepare('select * from sessions')
            const res = stmt.get()


            if (res) {

                this._dcId = res['dcId']
                this._serverAddress = res['serverAddress']
                this._port = res['port']
                this._authKey = new AuthKey(res['authKey'])
                this._takeoutId = res['takeoutId']
            }
        } else {
            // Tables don't exist, create new ones
            this._createTable(
                'version (version integer primary key)'
                ,
                `sessions (
                dcId integer primary key,
                    serverAddress text,
                    port integer,
                    authKey blob,
                    takeoutId integer
                )`,
                `entities (
                id integer primary key,
                    hash integer not null,
                    username text,
                    phone integer,
                    name text
                )`,
                `sent_files (
                md5Digest blob,
                    fileSize integer,
                    type integer,
                    id integer,
                    hash integer,
                    primary key(md5Digest, fileSize, type)
                )`,
                `updateState (
                id integer primary key,
                    pts integer,
                    qts integer,
                    date integer,
                    seq integer
                )`,
            )
            stmt = this.db.prepare('insert into version values (?)')
            stmt.run(CURRENT_VERSION)
            this._updateSessionTable()
            this.save()
        }

    }

    load() {

    }

    get authKey() {
        return super.authKey
    }

    _upgradeDatabase(old) {
        // nothing so far
    }

    _createTable(...definitions) {
        for (const definition of definitions) {
            this.db.exec(`create table ${definition}`)
        }
    }

    // Data from sessions should be kept as properties
    // not to fetch the database every time we need it
    setDC(dcId, serverAddress, port) {
        super.setDC(dcId, serverAddress, port)
        this._updateSessionTable()

        // Fetch the authKey corresponding to this data center
        const row = this.db.prepare('select authKey from sessions').get()
        if (row && row.authKey) {
            this._authKey = new AuthKey(row.authKey)
        } else {
            this._authKey = null
        }
    }

    set authKey(value) {
        this._authKey = value
        this._updateSessionTable()
    }

    set takeoutId(value) {
        this._takeoutId = value
        this._updateSessionTable()
    }

    _updateSessionTable() {
        // While we can save multiple rows into the sessions table
        // currently we only want to keep ONE as the tables don't
        // tell us which auth_key's are usable and will work. Needs
        // some more work before being able to save auth_key's for
        // multiple DCs. Probably done differently.
        this.db.exec('delete from sessions')
        const stmt = this.db.prepare('insert or replace into sessions values (?,?,?,?,?)')
        stmt.run(this._dcId, this._serverAddress,
            this._port, this._authKey ? this._authKey.key : Buffer.alloc(0), this._takeoutId)
    }

    getUpdateState(entityId) {
        const row = this.db.prepare('select pts, qts, date, seq from updateState where id=?').get(entityId)
        if (row) {
            return new types.update.State({
                pts: row.pts,
                qts: row.qts, date: new Date(row.date), seq: row.seq, unreadCount: 0,
            })
        }
    }

    setUpdateState(entityId, state) {
        const stmt = this.db.prepare('insert or replace into updateState values (?,?,?,?,?)')
        stmt.run(entityId, state.pts, state.qts,
            state.date.getTime(), state.seq)
    }

    save() {
        // currently nothing needs to be done
    }

    /**
     * Deletes the current session file
     */
    delete() {
        if (this.db.name === ':memory:') {
            return true
        }
        try {
            fs.unlinkSync(this.db.name)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * Lists all the sessions of the users who have ever connected
     * using this client and never logged out
     */
    listSessions() {
        // ???
    }

    // Entity processing
    /**
     * Processes all the found entities on the given TLObject,
     * unless .enabled is False.
     *
     * Returns True if new input entities were added.
     * @param tlo
     */
    processEntities(tlo) {
        if (!this.saveEntities) {
            return
        }
        const rows = this._entitiesToRows(tlo)
        if (!rows) {
            return
        }
        for (const row of rows) {
            row[1] = Database.Integer(row[1].toString())
            const stmt = this.db.prepare('insert or replace into entities values (?,?,?,?,?)')
            stmt.run(...row)
        }
    }

    getEntityRowsByPhone(phone) {
        return this.db.prepare('select id, hash from entities where phone=?').get(phone)
    }

    getEntityRowsByUsername(username) {
        return this.db.prepare('select id, hash from entities where username=?').get(username)
    }

    getEntityRowsByName(name) {
        return this.db.prepare('select id, hash from entities where name=?').get(name)
    }

    getEntityRowsById(id, exact = true) {
        if (exact) {
            return this.db.prepare('select id, hash from entities where id=?').get(id)
        } else {
            return this.db.prepare('select id, hash from entities where id in (?,?,?)').get(
                utils.getPeerId(new PeerUser(id)),
                utils.getPeerId(new PeerChat(id)),
                utils.getPeerId(new PeerChannel(id)),
            )
        }
    }

    // File processing

    getFile(md5Digest, fileSize, cls) {
        // nope
    }

    cacheFile(md5Digest, fileSize, instance) {
        // nope
    }
}

module.exports = SQLiteSession
