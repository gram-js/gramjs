<<<<<<< HEAD
require('regenerator-runtime/runtime')
require('regenerator-runtime')
=======
const gramJsApi = require('./tl/gramJsApi')
>>>>>>> f70d85dd... Gram JS: Replace generated `tl/*` contents with runtime logic; TypeScript typings

const TelegramClient = require('./client/TelegramClient')

const connection = require('./network')
const tl = require('./tl')
const version = require('./Version')
const events = require('./events')
const utils = require('./Utils')
const errors = require('./errors')
const sessions = require('./sessions')
const extensions = require('./extensions')

module.exports = {
<<<<<<< HEAD
    gramJsApi, TelegramClient, session, connection, extensions,
=======
    Api, TelegramClient, sessions, connection, extensions,
>>>>>>> 42589b8b... GramJS: Add `LocalStorageSession` with keys and hashes for all DCs
    tl, version, events, utils, errors,
}
