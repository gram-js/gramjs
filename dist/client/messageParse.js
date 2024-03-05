"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._getResponseMessage = exports._parseMessageText = exports._replaceWithMention = exports.DEFAULT_DELIMITERS = void 0;
const Utils_1 = require("../Utils");
const api_1 = require("../tl/api");
const index_1 = require("../index");
const Helpers_1 = require("../Helpers");
const big_integer_1 = __importDefault(require("big-integer"));
exports.DEFAULT_DELIMITERS = {
    "**": api_1.Api.MessageEntityBold,
    __: api_1.Api.MessageEntityItalic,
    "~~": api_1.Api.MessageEntityStrike,
    "`": api_1.Api.MessageEntityCode,
    "```": api_1.Api.MessageEntityPre,
};
/** @hidden */
async function _replaceWithMention(client, entities, i, user) {
    try {
        entities[i] = new api_1.Api.InputMessageEntityMentionName({
            offset: entities[i].offset,
            length: entities[i].length,
            userId: (await client.getInputEntity(user)),
        });
        return true;
    }
    catch (e) {
        return false;
    }
}
exports._replaceWithMention = _replaceWithMention;
/** @hidden */
async function _parseMessageText(client, message, parseMode) {
    if (parseMode == false) {
        return [message, []];
    }
    if (parseMode == undefined) {
        if (client.parseMode == undefined) {
            return [message, []];
        }
        parseMode = client.parseMode;
    }
    else if (typeof parseMode === "string") {
        parseMode = (0, Utils_1.sanitizeParseMode)(parseMode);
    }
    const [rawMessage, msgEntities] = parseMode.parse(message);
    for (let i = msgEntities.length - 1; i >= 0; i--) {
        const e = msgEntities[i];
        if (e instanceof api_1.Api.MessageEntityTextUrl) {
            const m = /^@|\+|tg:\/\/user\?id=(\d+)/.exec(e.url);
            if (m) {
                const userIdOrUsername = m[1] ? Number(m[1]) : e.url;
                const isMention = await _replaceWithMention(client, msgEntities, i, userIdOrUsername);
                if (!isMention) {
                    msgEntities.splice(i, 1);
                }
            }
        }
    }
    return [rawMessage, msgEntities];
}
exports._parseMessageText = _parseMessageText;
/** @hidden */
function _getResponseMessage(client, request, result, inputChat) {
    let updates = [];
    let entities = new Map();
    if (result instanceof api_1.Api.UpdateShort) {
        updates = [result.update];
    }
    else if (result instanceof api_1.Api.Updates ||
        result instanceof api_1.Api.UpdatesCombined) {
        updates = result.updates;
        for (const x of [...result.users, ...result.chats]) {
            entities.set(index_1.utils.getPeerId(x), x);
        }
    }
    else {
        return;
    }
    const randomToId = new Map();
    const idToMessage = new Map();
    let schedMessage;
    for (const update of updates) {
        if (update instanceof api_1.Api.UpdateMessageID) {
            randomToId.set(update.randomId.toString(), update.id);
        }
        else if (update instanceof api_1.Api.UpdateNewChannelMessage ||
            update instanceof api_1.Api.UpdateNewMessage) {
            update.message._finishInit(client, entities, inputChat);
            if ("randomId" in request || (0, Helpers_1.isArrayLike)(request)) {
                idToMessage.set(update.message.id, update.message);
            }
            else {
                return update.message;
            }
        }
        else if (update instanceof api_1.Api.UpdateEditMessage &&
            "peer" in request &&
            (0, Helpers_1._entityType)(request.peer) != Helpers_1._EntityType.CHANNEL) {
            update.message._finishInit(client, entities, inputChat);
            if ("randomId" in request) {
                idToMessage.set(update.message.id, update.message);
            }
            else if ("id" in request && request.id === update.message.id) {
                return update.message;
            }
        }
        else if (update instanceof api_1.Api.UpdateEditChannelMessage &&
            "peer" in request &&
            (0, Utils_1.getPeerId)(request.peer) ==
                (0, Utils_1.getPeerId)(update.message.peerId)) {
            if (request.id == update.message.id) {
                update.message._finishInit(client, entities, inputChat);
                return update.message;
            }
        }
        else if (update instanceof api_1.Api.UpdateNewScheduledMessage) {
            update.message._finishInit(client, entities, inputChat);
            schedMessage = update.message;
            idToMessage.set(update.message.id, update.message);
        }
        else if (update instanceof api_1.Api.UpdateMessagePoll) {
            if (request.media.poll.id == update.pollId) {
                const m = new api_1.Api.Message({
                    id: request.id,
                    peerId: index_1.utils.getPeerId(request.peer),
                    media: new api_1.Api.MessageMediaPoll({
                        poll: update.poll,
                        results: update.results,
                    }),
                    message: "",
                    date: 0,
                });
                m._finishInit(client, entities, inputChat);
                return m;
            }
        }
    }
    if (request == undefined) {
        return idToMessage;
    }
    let randomId;
    if ((0, Helpers_1.isArrayLike)(request) ||
        typeof request == "number" ||
        big_integer_1.default.isInstance(request)) {
        randomId = request;
    }
    else {
        randomId = request.randomId;
    }
    if (!randomId) {
        if (schedMessage) {
            return schedMessage;
        }
        client._log.warn(`No randomId in ${request} to map to. returning undefined for ${result}`);
        return undefined;
    }
    if (!(0, Helpers_1.isArrayLike)(randomId)) {
        let msg = idToMessage.get(randomToId.get(randomId.toString()));
        if (!msg) {
            client._log.warn(`Request ${request.className} had missing message mapping ${result.className}`);
        }
        return msg;
    }
    const final = [];
    let warned = false;
    for (const rnd of randomId) {
        const tmp = randomToId.get(rnd.toString());
        if (!tmp) {
            warned = true;
            break;
        }
        const tmp2 = idToMessage.get(tmp);
        if (!tmp2) {
            warned = true;
            break;
        }
        final.push(tmp2);
    }
    if (warned) {
        client._log.warn(`Request ${request.className} had missing message mapping ${result.className}`);
    }
    const finalToReturn = [];
    for (const rnd of randomId) {
        finalToReturn.push(idToMessage.get(randomToId.get(rnd.toString())));
    }
    return finalToReturn;
}
exports._getResponseMessage = _getResponseMessage;
