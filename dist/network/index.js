"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionTCPObfuscated = exports.ConnectionTCPAbridged = exports.ConnectionTCPFull = exports.Connection = exports.UpdateConnectionState = exports.MTProtoSender = exports.doAuthentication = exports.MTProtoPlainSender = void 0;
var MTProtoPlainSender_1 = require("./MTProtoPlainSender");
Object.defineProperty(exports, "MTProtoPlainSender", { enumerable: true, get: function () { return MTProtoPlainSender_1.MTProtoPlainSender; } });
var Authenticator_1 = require("./Authenticator");
Object.defineProperty(exports, "doAuthentication", { enumerable: true, get: function () { return Authenticator_1.doAuthentication; } });
var MTProtoSender_1 = require("./MTProtoSender");
Object.defineProperty(exports, "MTProtoSender", { enumerable: true, get: function () { return MTProtoSender_1.MTProtoSender; } });
class UpdateConnectionState {
    constructor(state) {
        this.state = state;
    }
}
exports.UpdateConnectionState = UpdateConnectionState;
UpdateConnectionState.disconnected = -1;
UpdateConnectionState.connected = 1;
UpdateConnectionState.broken = 0;
var connection_1 = require("./connection");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return connection_1.Connection; } });
Object.defineProperty(exports, "ConnectionTCPFull", { enumerable: true, get: function () { return connection_1.ConnectionTCPFull; } });
Object.defineProperty(exports, "ConnectionTCPAbridged", { enumerable: true, get: function () { return connection_1.ConnectionTCPAbridged; } });
Object.defineProperty(exports, "ConnectionTCPObfuscated", { enumerable: true, get: function () { return connection_1.ConnectionTCPObfuscated; } });
