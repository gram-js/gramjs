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
exports.users = exports.uploads = exports.updates = exports.tgClient = exports.telegramBaseClient = exports.message = exports.messageParse = exports.downloads = exports.dialogs = exports.chats = exports.buttons = exports.bots = exports.auth = exports.twoFA = void 0;
const twoFA = __importStar(require("./2fa"));
exports.twoFA = twoFA;
const auth = __importStar(require("./auth"));
exports.auth = auth;
const bots = __importStar(require("./bots"));
exports.bots = bots;
const buttons = __importStar(require("./buttons"));
exports.buttons = buttons;
const chats = __importStar(require("./chats"));
exports.chats = chats;
const dialogs = __importStar(require("./dialogs"));
exports.dialogs = dialogs;
const downloads = __importStar(require("./downloads"));
exports.downloads = downloads;
const messageParse = __importStar(require("./messageParse"));
exports.messageParse = messageParse;
const message = __importStar(require("./messages"));
exports.message = message;
const telegramBaseClient = __importStar(require("./telegramBaseClient"));
exports.telegramBaseClient = telegramBaseClient;
const tgClient = __importStar(require("./TelegramClient"));
exports.tgClient = tgClient;
const updates = __importStar(require("./updates"));
exports.updates = updates;
const uploads = __importStar(require("./uploads"));
exports.uploads = uploads;
const users = __importStar(require("./users"));
exports.users = users;
