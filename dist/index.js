"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = exports.password = exports.tl = exports.helpers = exports.extensions = exports.sessions = exports.errors = exports.utils = exports.Logger = exports.version = exports.Connection = exports.TelegramClient = exports.Api = void 0;
var tl_1 = require("./tl");
Object.defineProperty(exports, "Api", { enumerable: true, get: function () { return tl_1.Api; } });
const tl = __importStar(require("./tl"));
exports.tl = tl;
var TelegramClient_1 = require("./client/TelegramClient");
Object.defineProperty(exports, "TelegramClient", { enumerable: true, get: function () { return TelegramClient_1.TelegramClient; } });
var network_1 = require("./network");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return network_1.Connection; } });
var Version_1 = require("./Version");
Object.defineProperty(exports, "version", { enumerable: true, get: function () { return Version_1.version; } });
var Logger_1 = require("./extensions/Logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return Logger_1.Logger; } });
const utils = __importStar(require("./Utils"));
exports.utils = utils;
const errors = __importStar(require("./errors"));
exports.errors = errors;
const sessions = __importStar(require("./sessions"));
exports.sessions = sessions;
const extensions = __importStar(require("./extensions"));
exports.extensions = extensions;
const helpers = __importStar(require("./Helpers"));
exports.helpers = helpers;
const client = __importStar(require("./client"));
exports.client = client;
const password = __importStar(require("./Password"));
exports.password = password;
