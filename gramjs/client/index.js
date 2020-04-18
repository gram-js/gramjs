const BaseClient = require('./BaseClient')
const UpdateMethods = require('./UpdateMethods')
const UserMethods = require('./UserMethods')
const MessageMethods = require('./MessageMethods')
const MessageParse = require('./MessageParse')
const ButtonMethods = require('./ButtonMethods')
const { mix } = require('../Helpers')

class TelegramClient extends mix(BaseClient)
    .with(UpdateMethods, UserMethods, MessageMethods, MessageParse, ButtonMethods) {}

module.exports = TelegramClient
