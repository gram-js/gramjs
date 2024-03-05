"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommentData = exports.markAsRead = exports._pin = exports.unpinMessage = exports.pinMessage = exports.deleteMessages = exports.editMessage = exports.forwardMessages = exports.sendMessage = exports.getMessages = exports.iterMessages = exports._IDsIter = exports._MessagesIter = void 0;
const tl_1 = require("../tl");
const requestIter_1 = require("../requestIter");
const Helpers_1 = require("../Helpers");
const Utils_1 = require("../Utils");
const __1 = require("../");
const messageParse_1 = require("./messageParse");
const users_1 = require("./users");
const big_integer_1 = __importDefault(require("big-integer"));
const uploads_1 = require("./uploads");
const _MAX_CHUNK_SIZE = 100;
class _MessagesIter extends requestIter_1.RequestIter {
    async _init({ entity, offsetId, minId, maxId, fromUser, offsetDate, addOffset, filter, search, replyTo, }) {
        var e_1, _a;
        if (entity) {
            this.entity = await this.client.getInputEntity(entity);
        }
        else {
            this.entity = undefined;
            if (this.reverse) {
                throw new Error("Cannot reverse global search");
            }
        }
        if (this.reverse) {
            offsetId = Math.max(offsetId, minId);
            if (offsetId && maxId) {
                if (maxId - offsetId <= 1) {
                    return false;
                }
            }
            if (!maxId) {
                maxId = Number.MAX_SAFE_INTEGER;
            }
        }
        else {
            offsetId = Math.max(offsetId, maxId);
            if (offsetId && minId) {
                if (offsetId - minId <= 1) {
                    return false;
                }
            }
        }
        if (this.reverse) {
            if (offsetId) {
                offsetId += 1;
            }
            else if (!offsetDate) {
                offsetId = 1;
            }
        }
        if (fromUser) {
            fromUser = await this.client.getInputEntity(fromUser);
        }
        if (!this.entity && fromUser) {
            this.entity = new tl_1.Api.InputPeerEmpty();
        }
        if (!filter) {
            filter = new tl_1.Api.InputMessagesFilterEmpty();
        }
        if (!this.entity) {
            this.request = new tl_1.Api.messages.SearchGlobal({
                q: search || "",
                filter: filter,
                minDate: undefined,
                // TODO fix this smh
                maxDate: offsetDate,
                offsetRate: undefined,
                offsetPeer: new tl_1.Api.InputPeerEmpty(),
                offsetId: offsetId,
                limit: 1,
            });
        }
        else if (replyTo !== undefined) {
            this.request = new tl_1.Api.messages.GetReplies({
                peer: this.entity,
                msgId: replyTo,
                offsetId: offsetId,
                offsetDate: offsetDate,
                addOffset: addOffset,
                limit: 0,
                maxId: 0,
                minId: 0,
                hash: big_integer_1.default.zero,
            });
        }
        else if (search !== undefined ||
            !(filter instanceof tl_1.Api.InputMessagesFilterEmpty) ||
            fromUser !== undefined) {
            this.request = new tl_1.Api.messages.Search({
                peer: this.entity,
                q: search || "",
                filter: typeof filter === "function" ? new filter() : filter,
                minDate: undefined,
                maxDate: offsetDate,
                offsetId: offsetId,
                addOffset: addOffset,
                limit: 0,
                maxId: 0,
                minId: 0,
                hash: (0, Helpers_1.generateRandomBigInt)(),
                fromId: fromUser,
            });
            if (!(filter instanceof tl_1.Api.InputMessagesFilterEmpty) &&
                offsetDate &&
                !search &&
                !offsetId) {
                try {
                    for (var _b = __asyncValues(this.client.iterMessages(this.entity, {
                        limit: 1,
                        offsetDate: offsetDate,
                    })), _c; _c = await _b.next(), !_c.done;) {
                        const m = _c.value;
                        this.request.offsetId = m.id + 1;
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        }
        else {
            this.request = new tl_1.Api.messages.GetHistory({
                peer: this.entity,
                limit: 1,
                offsetDate: offsetDate,
                offsetId: offsetId,
                minId: 0,
                maxId: 0,
                addOffset: addOffset,
                hash: big_integer_1.default.zero,
            });
        }
        if (this.limit <= 0) {
            const result = await this.client.invoke(this.request);
            if (result instanceof tl_1.Api.messages.MessagesNotModified) {
                this.total = result.count;
            }
            else {
                if ("count" in result) {
                    this.total = result.count;
                }
                else {
                    this.total = result.messages.length;
                }
            }
            return false;
        }
        if (!this.waitTime) {
            this.waitTime = this.limit > 3000 ? 1 : 0;
        }
        if (this.reverse &&
            !(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
            this.request.addOffset -= _MAX_CHUNK_SIZE;
        }
        this.addOffset = addOffset;
        this.maxId = maxId;
        this.minId = minId;
        this.lastId = this.reverse ? 0 : Number.MAX_SAFE_INTEGER;
    }
    async _loadNextChunk() {
        var _a;
        if (!this.request) {
            throw new Error("Request not set yet");
        }
        this.request.limit = Math.min(this.left, _MAX_CHUNK_SIZE);
        if (this.reverse && this.request.limit != _MAX_CHUNK_SIZE) {
            if (!(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
                this.request.addOffset = this.addOffset - this.request.limit;
            }
        }
        const r = await this.client.invoke(this.request);
        if (r instanceof tl_1.Api.messages.MessagesNotModified) {
            return true;
        }
        if ("count" in r) {
            this.total = r.count;
        }
        else {
            this.total = r.messages.length;
        }
        const entities = new Map();
        for (const x of [...r.users, ...r.chats]) {
            entities.set((0, Utils_1.getPeerId)(x), x);
        }
        const messages = this.reverse
            ? r.messages.reverse()
            : r.messages;
        for (const message of messages) {
            if (!this._messageInRange(message)) {
                return true;
            }
            this.lastId = message.id;
            try {
                // if this fails it shouldn't be a big problem
                message._finishInit(this.client, entities, this.entity);
            }
            catch (e) { }
            message._entities = entities;
            (_a = this.buffer) === null || _a === void 0 ? void 0 : _a.push(message);
        }
        if (r.messages.length < this.request.limit) {
            return true;
        }
        if (this.buffer) {
            this._updateOffset(this.buffer[this.buffer.length - 1], r);
        }
        else {
            return true;
        }
    }
    _messageInRange(message) {
        if (this.entity) {
            if (this.reverse) {
                if (message.id <= this.lastId || message.id >= this.maxId) {
                    return false;
                }
            }
            else {
                if (message.id >= this.lastId || message.id <= this.minId) {
                    return false;
                }
            }
        }
        return true;
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
    _updateOffset(lastMessage, response) {
        if (!this.request) {
            throw new Error("Request not set yet");
        }
        this.request.offsetId = Number(lastMessage.id);
        if (this.reverse) {
            this.request.offsetId += 1;
        }
        if (this.request instanceof tl_1.Api.messages.Search) {
            this.request.maxDate = -1;
        }
        else {
            if (!(this.request instanceof tl_1.Api.messages.SearchGlobal)) {
                this.request.offsetDate = lastMessage.date;
            }
        }
        if (this.request instanceof tl_1.Api.messages.SearchGlobal) {
            if (lastMessage.inputChat) {
                this.request.offsetPeer = lastMessage.inputChat;
            }
            else {
                this.request.offsetPeer = new tl_1.Api.InputPeerEmpty();
            }
            this.request.offsetRate = response.nextRate;
        }
    }
}
exports._MessagesIter = _MessagesIter;
class _IDsIter extends requestIter_1.RequestIter {
    async _init({ entity, ids }) {
        this.total = ids.length;
        this._ids = this.reverse ? ids.reverse() : ids;
        this._offset = 0;
        this._entity = entity
            ? await this.client.getInputEntity(entity)
            : undefined;
        this._ty = this._entity ? (0, Helpers_1._entityType)(this._entity) : undefined;
        if (!this.waitTime) {
            this.waitTime = this.limit > 300 ? 10 : 0;
        }
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
    async _loadNextChunk() {
        var _a, _b, _c;
        const ids = this._ids.slice(this._offset, this._offset + _MAX_CHUNK_SIZE);
        if (!ids.length) {
            return false;
        }
        this._offset += _MAX_CHUNK_SIZE;
        let fromId;
        let r;
        if (this._ty == Helpers_1._EntityType.CHANNEL) {
            try {
                r = await this.client.invoke(new tl_1.Api.channels.GetMessages({
                    channel: this._entity,
                    id: ids,
                }));
            }
            catch (e) {
                if (e.errorMessage == "MESSAGE_IDS_EMPTY") {
                    r = new tl_1.Api.messages.MessagesNotModified({
                        count: ids.length,
                    });
                }
                else {
                    throw e;
                }
            }
        }
        else {
            r = await this.client.invoke(new tl_1.Api.messages.GetMessages({
                id: ids,
            }));
            if (this._entity) {
                fromId = await (0, users_1._getPeer)(this.client, this._entity);
            }
        }
        if (r instanceof tl_1.Api.messages.MessagesNotModified) {
            (_a = this.buffer) === null || _a === void 0 ? void 0 : _a.push(...Array(ids.length));
            return;
        }
        const entities = new Map();
        for (const entity of [...r.users, ...r.chats]) {
            entities.set(__1.utils.getPeerId(entity), entity);
        }
        let message;
        for (message of r.messages) {
            if (message instanceof tl_1.Api.MessageEmpty ||
                (fromId &&
                    __1.utils.getPeerId(message.peerId) != __1.utils.getPeerId(fromId))) {
                (_b = this.buffer) === null || _b === void 0 ? void 0 : _b.push(undefined);
            }
            else {
                const temp = message;
                temp._finishInit(this.client, entities, this._entity);
                temp._entities = entities;
                (_c = this.buffer) === null || _c === void 0 ? void 0 : _c.push(temp);
            }
        }
    }
}
exports._IDsIter = _IDsIter;
const IterMessagesDefaults = {
    limit: undefined,
    offsetDate: undefined,
    offsetId: 0,
    maxId: 0,
    minId: 0,
    addOffset: 0,
    search: undefined,
    filter: undefined,
    fromUser: undefined,
    waitTime: undefined,
    ids: undefined,
    reverse: false,
    replyTo: undefined,
    scheduled: false,
};
/** @hidden */
function iterMessages(client, entity, options) {
    const { limit, offsetDate, offsetId, maxId, minId, addOffset, search, filter, fromUser, waitTime, ids, reverse, replyTo, } = Object.assign(Object.assign({}, IterMessagesDefaults), options);
    if (ids) {
        let idsArray;
        if (!(0, Helpers_1.isArrayLike)(ids)) {
            idsArray = [ids];
        }
        else {
            idsArray = ids;
        }
        return new _IDsIter(client, idsArray.length, {
            reverse: reverse,
            waitTime: waitTime,
        }, {
            entity: entity,
            ids: idsArray,
        });
    }
    return new _MessagesIter(client, limit, {
        waitTime: waitTime,
        reverse: reverse,
    }, {
        entity: entity,
        offsetId: offsetId,
        minId: minId,
        maxId: maxId,
        fromUser: fromUser,
        offsetDate: offsetDate,
        addOffset: addOffset,
        filter: filter,
        search: search,
        replyTo: replyTo,
    });
}
exports.iterMessages = iterMessages;
/** @hidden */
async function getMessages(client, entity, params) {
    var e_2, _a;
    if (Object.keys(params).length == 1 && params.limit === undefined) {
        if (params.minId === undefined && params.maxId === undefined) {
            params.limit = undefined;
        }
        else {
            params.limit = 1;
        }
    }
    const it = client.iterMessages(entity, params);
    const ids = params.ids;
    if (ids && !(0, Helpers_1.isArrayLike)(ids)) {
        try {
            for (var it_1 = __asyncValues(it), it_1_1; it_1_1 = await it_1.next(), !it_1_1.done;) {
                const message = it_1_1.value;
                return [message];
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (it_1_1 && !it_1_1.done && (_a = it_1.return)) await _a.call(it_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return [];
    }
    return (await it.collect());
}
exports.getMessages = getMessages;
// region Message
/** @hidden */
async function sendMessage(client, 
/** To who will it be sent. */
entity, 
/**  The message to be sent, or another message object to resend as a copy.<br/>
 * The maximum length for a message is 35,000 bytes or 4,096 characters.<br/>
 * Longer messages will not be sliced automatically, and you should slice them manually if the text to send is longer than said length. */
{ message, replyTo, attributes, parseMode, formattingEntities, linkPreview = true, file, thumb, forceDocument, clearDraft, buttons, silent, supportStreaming, schedule, noforwards, commentTo, topMsgId, } = {}) {
    if (file) {
        return client.sendFile(entity, {
            file: file,
            caption: message
                ? typeof message == "string"
                    ? message
                    : message.message
                : "",
            forceDocument: forceDocument,
            clearDraft: clearDraft,
            replyTo: replyTo,
            attributes: attributes,
            thumb: thumb,
            supportsStreaming: supportStreaming,
            parseMode: parseMode,
            formattingEntities: formattingEntities,
            silent: silent,
            scheduleDate: schedule,
            buttons: buttons,
            noforwards: noforwards,
            commentTo: commentTo,
            topMsgId: topMsgId,
        });
    }
    entity = await client.getInputEntity(entity);
    if (commentTo != undefined) {
        const discussionData = await getCommentData(client, entity, commentTo);
        entity = discussionData.entity;
        replyTo = discussionData.replyTo;
    }
    let markup, request;
    let replyObject = undefined;
    if (replyTo != undefined) {
        replyObject = new tl_1.Api.InputReplyToMessage({
            replyToMsgId: (0, Utils_1.getMessageId)(replyTo),
            topMsgId: (0, Utils_1.getMessageId)(topMsgId),
        });
    }
    if (message && message instanceof tl_1.Api.Message) {
        if (buttons == undefined) {
            markup = message.replyMarkup;
        }
        else {
            markup = client.buildReplyMarkup(buttons);
        }
        if (silent == undefined) {
            silent = message.silent;
        }
        if (message.media &&
            !(message.media instanceof tl_1.Api.MessageMediaWebPage)) {
            return client.sendFile(entity, {
                file: message.media,
                caption: message.message,
                silent: silent,
                replyTo: replyTo,
                buttons: markup,
                formattingEntities: message.entities,
                scheduleDate: schedule,
            });
        }
        request = new tl_1.Api.messages.SendMessage({
            peer: entity,
            message: message.message || "",
            silent: silent,
            replyTo: replyObject,
            replyMarkup: markup,
            entities: message.entities,
            clearDraft: clearDraft,
            noWebpage: !(message.media instanceof tl_1.Api.MessageMediaWebPage),
            scheduleDate: schedule,
            noforwards: noforwards,
        });
        message = message.message;
    }
    else {
        if (formattingEntities == undefined) {
            [message, formattingEntities] = await (0, messageParse_1._parseMessageText)(client, message || "", parseMode);
        }
        if (!message) {
            throw new Error("The message cannot be empty unless a file is provided");
        }
        request = new tl_1.Api.messages.SendMessage({
            peer: entity,
            message: message.toString(),
            entities: formattingEntities,
            noWebpage: !linkPreview,
            replyTo: replyObject,
            clearDraft: clearDraft,
            silent: silent,
            replyMarkup: client.buildReplyMarkup(buttons),
            scheduleDate: schedule,
            noforwards: noforwards,
        });
    }
    const result = await client.invoke(request);
    if (result instanceof tl_1.Api.UpdateShortSentMessage) {
        const msg = new tl_1.Api.Message({
            id: result.id,
            peerId: await (0, users_1._getPeer)(client, entity),
            message: message,
            date: result.date,
            out: result.out,
            media: result.media,
            entities: result.entities,
            replyMarkup: request.replyMarkup,
            ttlPeriod: result.ttlPeriod,
        });
        msg._finishInit(client, new Map(), entity);
        return msg;
    }
    return client._getResponseMessage(request, result, entity);
}
exports.sendMessage = sendMessage;
/** @hidden */
async function forwardMessages(client, entity, { messages, fromPeer, silent, schedule, noforwards, dropAuthor, }) {
    if (!(0, Helpers_1.isArrayLike)(messages)) {
        messages = [messages];
    }
    entity = await client.getInputEntity(entity);
    let fromPeerId;
    if (fromPeer) {
        fromPeer = await client.getInputEntity(fromPeer);
        fromPeerId = await client.getPeerId(fromPeer);
    }
    const getKey = (m) => {
        if (m instanceof tl_1.Api.Message) {
            return m.chatId;
        }
        let msgId = (0, Utils_1.parseID)(m);
        if (msgId) {
            if (fromPeerId !== undefined) {
                return fromPeerId;
            }
            throw new Error("fromPeer must be given if integer IDs are used");
        }
        else {
            throw new Error(`Cannot forward ${m}`);
        }
    };
    const sent = [];
    for (let [chatId, chunk] of (0, Helpers_1.groupBy)(messages, getKey)) {
        let chat;
        let numbers = [];
        if (typeof chunk[0] == "number") {
            chat = fromPeer;
            numbers = chunk;
        }
        else {
            chat = await chunk[0].getInputChat();
            numbers = chunk.map((m) => m.id);
        }
        chunk.push();
        const request = new tl_1.Api.messages.ForwardMessages({
            fromPeer: chat,
            id: numbers,
            toPeer: entity,
            silent: silent,
            scheduleDate: schedule,
            noforwards: noforwards,
            dropAuthor: dropAuthor,
        });
        const result = await client.invoke(request);
        sent.push(client._getResponseMessage(request, result, entity));
    }
    return sent;
}
exports.forwardMessages = forwardMessages;
/** @hidden */
async function editMessage(client, entity, { message, text, parseMode, formattingEntities, linkPreview = true, file, forceDocument, buttons, schedule, }) {
    if (typeof message === "number" &&
        typeof text === "undefined" &&
        !file &&
        !schedule) {
        throw Error("You have to provide either file or text or schedule property.");
    }
    entity = await client.getInputEntity(entity);
    let id;
    let markup;
    let entities;
    let inputMedia;
    if (file) {
        const { fileHandle, media, image } = await (0, uploads_1._fileToMedia)(client, {
            file,
            forceDocument,
        });
        inputMedia = media;
    }
    if (message instanceof tl_1.Api.Message) {
        id = (0, Utils_1.getMessageId)(message);
        text = message.message;
        entities = message.entities;
        if (buttons == undefined) {
            markup = message.replyMarkup;
        }
        else {
            markup = client.buildReplyMarkup(buttons);
        }
        if (message.media) {
            inputMedia = (0, Utils_1.getInputMedia)(message.media, { forceDocument });
        }
    }
    else {
        if (typeof message !== "number") {
            throw Error("editMessageParams.message must be either a number or a Api.Message type");
        }
        id = message;
        if (formattingEntities == undefined) {
            [text, entities] = await (0, messageParse_1._parseMessageText)(client, text || "", parseMode);
        }
        else {
            entities = formattingEntities;
        }
        markup = client.buildReplyMarkup(buttons);
    }
    const request = new tl_1.Api.messages.EditMessage({
        peer: entity,
        id,
        message: text,
        noWebpage: !linkPreview,
        entities,
        media: inputMedia,
        replyMarkup: markup,
        scheduleDate: schedule,
    });
    const result = await client.invoke(request);
    return client._getResponseMessage(request, result, entity);
}
exports.editMessage = editMessage;
/** @hidden */
async function deleteMessages(client, entity, messageIds, { revoke = false }) {
    let ty = Helpers_1._EntityType.USER;
    if (entity) {
        entity = await client.getInputEntity(entity);
        ty = (0, Helpers_1._entityType)(entity);
    }
    const ids = [];
    for (const messageId of messageIds) {
        if (messageId instanceof tl_1.Api.Message ||
            messageId instanceof tl_1.Api.MessageService ||
            messageId instanceof tl_1.Api.MessageEmpty) {
            ids.push(messageId.id);
        }
        else if (typeof messageId === "number") {
            ids.push(messageId);
        }
        else {
            throw new Error(`Cannot convert ${messageId} to an integer`);
        }
    }
    const results = [];
    if (ty == Helpers_1._EntityType.CHANNEL) {
        for (const chunk of __1.utils.chunks(ids)) {
            results.push(client.invoke(new tl_1.Api.channels.DeleteMessages({
                channel: entity,
                id: chunk,
            })));
        }
    }
    else {
        for (const chunk of __1.utils.chunks(ids)) {
            results.push(client.invoke(new tl_1.Api.messages.DeleteMessages({
                id: chunk,
                revoke: revoke,
            })));
        }
    }
    return Promise.all(results);
}
exports.deleteMessages = deleteMessages;
/** @hidden */
async function pinMessage(client, entity, message, pinMessageParams) {
    return await _pin(client, entity, message, false, pinMessageParams === null || pinMessageParams === void 0 ? void 0 : pinMessageParams.notify, pinMessageParams === null || pinMessageParams === void 0 ? void 0 : pinMessageParams.pmOneSide);
}
exports.pinMessage = pinMessage;
/** @hidden */
async function unpinMessage(client, entity, message, unpinMessageParams) {
    return await _pin(client, entity, message, true, unpinMessageParams === null || unpinMessageParams === void 0 ? void 0 : unpinMessageParams.notify, unpinMessageParams === null || unpinMessageParams === void 0 ? void 0 : unpinMessageParams.pmOneSide);
}
exports.unpinMessage = unpinMessage;
/** @hidden */
async function _pin(client, entity, message, unpin, notify = false, pmOneSide = false) {
    message = __1.utils.getMessageId(message) || 0;
    if (message === 0) {
        return await client.invoke(new tl_1.Api.messages.UnpinAllMessages({
            peer: entity,
        }));
    }
    entity = await client.getInputEntity(entity);
    const request = new tl_1.Api.messages.UpdatePinnedMessage({
        silent: !notify,
        unpin,
        pmOneside: pmOneSide,
        peer: entity,
        id: message,
    });
    const result = await client.invoke(request);
    /**
     * Unpinning does not produce a service message.
     * Pinning a message that was already pinned also produces no service message.
     * Pinning a message in your own chat does not produce a service message,
     * but pinning on a private conversation with someone else does.
     */
    if (unpin ||
        !("updates" in result) ||
        ("updates" in result && !result.updates)) {
        return;
    }
    // Pinning a message that doesn't exist would RPC-error earlier
    return client._getResponseMessage(request, result, entity);
}
exports._pin = _pin;
/** @hidden */
async function markAsRead(client, entity, message, markAsReadParams) {
    let maxId = (markAsReadParams === null || markAsReadParams === void 0 ? void 0 : markAsReadParams.maxId) || 0;
    const maxIdIsUndefined = (markAsReadParams === null || markAsReadParams === void 0 ? void 0 : markAsReadParams.maxId) === undefined;
    if (maxIdIsUndefined) {
        if (message) {
            if (Array.isArray(message)) {
                maxId = Math.max(...message.map((v) => __1.utils.getMessageId(v)));
            }
            else {
                maxId = __1.utils.getMessageId(message);
            }
        }
    }
    entity = await client.getInputEntity(entity);
    if (markAsReadParams && !markAsReadParams.clearMentions) {
        await client.invoke(new tl_1.Api.messages.ReadMentions({ peer: entity }));
        if (maxIdIsUndefined && message === undefined) {
            return true;
        }
    }
    if ((0, Helpers_1._entityType)(entity) === Helpers_1._EntityType.CHANNEL) {
        return await client.invoke(new tl_1.Api.channels.ReadHistory({ channel: entity, maxId }));
    }
    else {
        await client.invoke(new tl_1.Api.messages.ReadHistory({ peer: entity, maxId }));
        return true;
    }
}
exports.markAsRead = markAsRead;
/** @hidden */
async function getCommentData(client, entity, message) {
    const result = await client.invoke(new tl_1.Api.messages.GetDiscussionMessage({
        peer: entity,
        msgId: __1.utils.getMessageId(message),
    }));
    const relevantMessage = result.messages[0];
    let chat;
    for (const c of result.chats) {
        if (relevantMessage.peerId instanceof tl_1.Api.PeerChannel &&
            c.id.eq(relevantMessage.peerId.channelId)) {
            chat = c;
            break;
        }
    }
    return {
        entity: __1.utils.getInputPeer(chat),
        replyTo: relevantMessage.id,
    };
}
exports.getCommentData = getCommentData;
// TODO do the rest
