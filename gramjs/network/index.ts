export {MTProtoPlainSender} from './MTProtoPlainSender'
export {doAuthentication} from './Authenticator'
export {MTProtoSender} from './MTProtoSender'

interface states {
    disconnected: -1,
    connected: 1,
    broken: 0,
}

export class UpdateConnectionState {
    static states = {
        disconnected: -1,
        connected: 1,
        broken: 0,
    };
    private state: number;

    constructor(state: number) {
        this.state = state

    }
}

export {
    Connection,
    ConnectionTCPFull,
    ConnectionTCPAbridged,
    ConnectionTCPObfuscated,
} from './connection'
