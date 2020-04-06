const BaseClient = require('./BaseClient')
const UserMethods = require('./UserMethods')
const { mix } = require('../Helpers')

class TelegramClient extends mix(BaseClient).with(UserMethods) {}

module.exports = TelegramClient
