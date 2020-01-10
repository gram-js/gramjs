const MTProtoPlainSender = require('./MTProtoPlainSender')
const doAuthentication = require('./Authenticator')
const MTProtoSender = require('./MTProtoSender')

class UpdateConnectionState {
    static states = {
        disconnected: -1,
        connected: 1
    }

    constructor(state) {
        this.state = state
    }
}

const {
    Connection,
    ConnectionTCPFull,
    ConnectionTCPAbridged,
    ConnectionTCPObfuscated,
} = require('./connection')
module.exports = {
    Connection,
    ConnectionTCPFull,
    ConnectionTCPAbridged,
    ConnectionTCPObfuscated,
    MTProtoPlainSender,
    doAuthentication,
    MTProtoSender,
    UpdateConnectionState,
}
