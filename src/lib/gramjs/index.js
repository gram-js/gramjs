require('regenerator-runtime/runtime')
require('regenerator-runtime')

const TelegramClient = require('./client/TelegramClient')
const connection = require('./network')
const tl = require('./tl')
const version = require('./Version')
const events = require('./events')
const utils = require('./Utils')
const errors = require('./errors')
const session = require('./sessions')
const extensions = require('./extensions')

module.exports = {
    TelegramClient, session, connection, extensions,
    tl, version, events, utils, errors,
}
