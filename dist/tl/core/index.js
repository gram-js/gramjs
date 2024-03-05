"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GZIPPacked = exports.MessageContainer = exports.TLMessage = exports.RPCResult = exports.coreObjects = void 0;
const TLMessage_1 = require("./TLMessage");
Object.defineProperty(exports, "TLMessage", { enumerable: true, get: function () { return TLMessage_1.TLMessage; } });
const RPCResult_1 = require("./RPCResult");
Object.defineProperty(exports, "RPCResult", { enumerable: true, get: function () { return RPCResult_1.RPCResult; } });
const MessageContainer_1 = require("./MessageContainer");
Object.defineProperty(exports, "MessageContainer", { enumerable: true, get: function () { return MessageContainer_1.MessageContainer; } });
const GZIPPacked_1 = require("./GZIPPacked");
Object.defineProperty(exports, "GZIPPacked", { enumerable: true, get: function () { return GZIPPacked_1.GZIPPacked; } });
exports.coreObjects = new Map([
    [RPCResult_1.RPCResult.CONSTRUCTOR_ID, RPCResult_1.RPCResult],
    [GZIPPacked_1.GZIPPacked.CONSTRUCTOR_ID, GZIPPacked_1.GZIPPacked],
    [MessageContainer_1.MessageContainer.CONSTRUCTOR_ID, MessageContainer_1.MessageContainer],
]);
