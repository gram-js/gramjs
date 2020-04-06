const BaseClient = require('./BaseClient')
const UpdateMethods = require('./UpdateMethods')
const UserMethods = require('./UserMethods')
const { mix } = require('../Helpers')

class TelegramClient extends mix(BaseClient).with(UpdateMethods, UserMethods) {}

module.exports = TelegramClient
