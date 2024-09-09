"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._selfId = exports._getInputNotify = exports._getInputDialog = exports._getPeer = exports.getPeerId = exports._getEntityFromString = exports.getInputEntity = exports.getEntity = exports.isUserAuthorized = exports.isBot = exports.getMe = exports.invoke = void 0;
const tl_1 = require("../tl");
const Utils_1 = require("../Utils");
const Helpers_1 = require("../Helpers");
const __1 = require("../");
const big_integer_1 = __importDefault(require("big-integer"));
const Logger_1 = require("../extensions/Logger");
const RequestState_1 = require("../network/RequestState");
// UserMethods {
// region Invoking Telegram request
/** @hidden */
async function invoke(client, request, dcId, otherSender) {
    if (request.classType !== "request") {
        throw new Error("You can only invoke MTProtoRequests");
    }
    let sender = client._sender;
    if (dcId) {
        sender = await client.getSender(dcId);
    }
    if (otherSender != undefined) {
        sender = otherSender;
    }
    if (sender == undefined) {
        throw new Error("Cannot send requests while disconnected. You need to call .connect()");
    }
    await client._connectedDeferred.promise;
    await request.resolve(client, __1.utils);
    client._lastRequest = new Date().getTime();
    const state = new RequestState_1.RequestState(request);
    let attempt = 0;
    for (attempt = 0; attempt < client._requestRetries; attempt++) {
        sender.addStateToQueue(state);
        try {
            const result = await state.promise;
            state.finished.resolve();
            client.session.processEntities(result);
            client._entityCache.add(result);
            return result;
        }
        catch (e) {
            if (e instanceof __1.errors.ServerError ||
                e.errorMessage === "RPC_CALL_FAIL" ||
                e.errorMessage === "RPC_MCGET_FAIL") {
                client._log.warn(`Telegram is having internal issues ${e.constructor.name}`);
                await (0, Helpers_1.sleep)(2000);
            }
            else if (e instanceof __1.errors.FloodWaitError ||
                e instanceof __1.errors.FloodTestPhoneWaitError) {
                if (e.seconds <= client.floodSleepThreshold) {
                    client._log.info(`Sleeping for ${e.seconds}s on flood wait (Caused by ${request.className})`);
                    await (0, Helpers_1.sleep)(e.seconds * 1000);
                }
                else {
                    state.finished.resolve();
                    throw e;
                }
            }
            else if (e instanceof __1.errors.PhoneMigrateError ||
                e instanceof __1.errors.NetworkMigrateError ||
                e instanceof __1.errors.UserMigrateError) {
                client._log.info(`Phone migrated to ${e.newDc}`);
                const shouldRaise = e instanceof __1.errors.PhoneMigrateError ||
                    e instanceof __1.errors.NetworkMigrateError;
                if (shouldRaise && (await client.isUserAuthorized())) {
                    state.finished.resolve();
                    throw e;
                }
                await client._switchDC(e.newDc);
                sender =
                    dcId === undefined
                        ? client._sender
                        : await client.getSender(dcId);
            }
            else if (e instanceof __1.errors.MsgWaitError) {
                // We need to resend this after the old one was confirmed.
                await state.isReady();
                state.after = undefined;
            }
            else if (e.message === "CONNECTION_NOT_INITED") {
                await client.disconnect();
                await (0, Helpers_1.sleep)(2000);
                await client.connect();
            }
            else {
                state.finished.resolve();
                throw e;
            }
        }
        state.resetPromise();
    }
    throw new Error(`Request was unsuccessful ${attempt} time(s)`);
}
exports.invoke = invoke;
/** @hidden */
async function getMe(client, inputPeer = false) {
    if (inputPeer && client._selfInputPeer) {
        return client._selfInputPeer;
    }
    const me = (await client.invoke(new tl_1.Api.users.GetUsers({ id: [new tl_1.Api.InputUserSelf()] })))[0];
    client._bot = me.bot;
    if (!client._selfInputPeer) {
        client._selfInputPeer = __1.utils.getInputPeer(me, false);
    }
    return inputPeer ? client._selfInputPeer : me;
}
exports.getMe = getMe;
/** @hidden */
async function isBot(client) {
    if (client._bot === undefined) {
        const me = await client.getMe();
        if (me) {
            return !(me instanceof tl_1.Api.InputPeerUser) ? me.bot : undefined;
        }
    }
    return client._bot;
}
exports.isBot = isBot;
/** @hidden */
async function isUserAuthorized(client) {
    try {
        await client.invoke(new tl_1.Api.updates.GetState());
        return true;
    }
    catch (e) {
        return false;
    }
}
exports.isUserAuthorized = isUserAuthorized;
/** @hidden */
async function getEntity(client, entity) {
    const single = !(0, Helpers_1.isArrayLike)(entity);
    let entityArray = [];
    if ((0, Helpers_1.isArrayLike)(entity)) {
        entityArray = entity;
    }
    else {
        entityArray.push(entity);
    }
    const inputs = [];
    for (const x of entityArray) {
        if (typeof x === "string") {
            const valid = (0, Utils_1.parseID)(x);
            if (valid) {
                inputs.push(await client.getInputEntity(valid));
            }
            else {
                inputs.push(x);
            }
        }
        else {
            inputs.push(await client.getInputEntity(x));
        }
    }
    const lists = new Map([
        [Helpers_1._EntityType.USER, []],
        [Helpers_1._EntityType.CHAT, []],
        [Helpers_1._EntityType.CHANNEL, []],
    ]);
    for (const x of inputs) {
        try {
            lists.get((0, Helpers_1._entityType)(x)).push(x);
        }
        catch (e) { }
    }
    let users = lists.get(Helpers_1._EntityType.USER);
    let chats = lists.get(Helpers_1._EntityType.CHAT);
    let channels = lists.get(Helpers_1._EntityType.CHANNEL);
    if (users.length) {
        users = await client.invoke(new tl_1.Api.users.GetUsers({
            id: users,
        }));
    }
    if (chats.length) {
        const chatIds = chats.map((x) => x.chatId);
        chats = (await client.invoke(new tl_1.Api.messages.GetChats({ id: chatIds }))).chats;
    }
    if (channels.length) {
        channels = (await client.invoke(new tl_1.Api.channels.GetChannels({ id: channels }))).chats;
    }
    const idEntity = new Map();
    for (const user of users) {
        idEntity.set((0, Utils_1.getPeerId)(user), user);
    }
    for (const channel of channels) {
        idEntity.set((0, Utils_1.getPeerId)(channel), channel);
    }
    for (const chat of chats) {
        idEntity.set((0, Utils_1.getPeerId)(chat), chat);
    }
    const result = [];
    for (const x of inputs) {
        if (typeof x === "string") {
            result.push(await _getEntityFromString(client, x));
        }
        else if (!(x instanceof tl_1.Api.InputPeerSelf)) {
            result.push(idEntity.get((0, Utils_1.getPeerId)(x)));
        }
        else {
            for (const [key, u] of idEntity.entries()) {
                if (u instanceof tl_1.Api.User && u.self) {
                    result.push(u);
                    break;
                }
            }
        }
    }
    return single ? result[0] : result;
}
exports.getEntity = getEntity;
/** @hidden */
async function getInputEntity(client, peer) {
    // Short-circuit if the input parameter directly maps to an InputPeer
    try {
        return __1.utils.getInputPeer(peer);
        // eslint-disable-next-line no-empty
    }
    catch (e) { }
    // Next in priority is having a peer (or its ID) cached in-memory
    try {
        if (typeof peer == "string") {
            const valid = (0, Utils_1.parseID)(peer);
            if (valid) {
                const res = client._entityCache.get(peer);
                if (res) {
                    return res;
                }
            }
        }
        if (typeof peer === "number" ||
            typeof peer === "bigint" ||
            big_integer_1.default.isInstance(peer)) {
            const res = client._entityCache.get(peer.toString());
            if (res) {
                return res;
            }
        }
        // 0x2d45687 == crc32(b'Peer')
        if (typeof peer == "object" &&
            !big_integer_1.default.isInstance(peer) &&
            peer.SUBCLASS_OF_ID === 0x2d45687) {
            const res = client._entityCache.get(__1.utils.getPeerId(peer));
            if (res) {
                return res;
            }
        }
        // eslint-disable-next-line no-empty
    }
    catch (e) { }
    // Then come known strings that take precedence
    if (typeof peer == "string") {
        if (["me", "this", "self"].includes(peer)) {
            return new tl_1.Api.InputPeerSelf();
        }
    }
    // No InputPeer, cached peer, or known string. Fetch from disk cache
    try {
        if (peer != undefined) {
            return client.session.getInputEntity(peer);
        }
        // eslint-disable-next-line no-empty
    }
    catch (e) { }
    // Only network left to try
    if (typeof peer === "string") {
        return __1.utils.getInputPeer(await _getEntityFromString(client, peer));
    }
    // If we're a bot and the user has messaged us privately users.getUsers
    // will work with accessHash = 0. Similar for channels.getChannels.
    // If we're not a bot but the user is in our contacts, it seems to work
    // regardless. These are the only two special-cased requests.
    if (typeof peer === "number") {
        peer = (0, Helpers_1.returnBigInt)(peer);
    }
    peer = __1.utils.getPeer(peer);
    if (peer instanceof tl_1.Api.PeerUser) {
        const users = await client.invoke(new tl_1.Api.users.GetUsers({
            id: [
                new tl_1.Api.InputUser({
                    userId: peer.userId,
                    accessHash: big_integer_1.default.zero,
                }),
            ],
        }));
        if (users.length && !(users[0] instanceof tl_1.Api.UserEmpty)) {
            // If the user passed a valid ID they expect to work for
            // channels but would be valid for users, we get UserEmpty.
            // Avoid returning the invalid empty input peer for that.
            //
            // We *could* try to guess if it's a channel first, and if
            // it's not, work as a chat and try to validate it through
            // another request, but that becomes too much work.
            return __1.utils.getInputPeer(users[0]);
        }
    }
    else if (peer instanceof tl_1.Api.PeerChat) {
        return new tl_1.Api.InputPeerChat({
            chatId: peer.chatId,
        });
    }
    else if (peer instanceof tl_1.Api.PeerChannel) {
        try {
            const channels = await client.invoke(new tl_1.Api.channels.GetChannels({
                id: [
                    new tl_1.Api.InputChannel({
                        channelId: peer.channelId,
                        accessHash: big_integer_1.default.zero,
                    }),
                ],
            }));
            return __1.utils.getInputPeer(channels.chats[0]);
        }
        catch (e) {
            if (client._errorHandler) {
                await client._errorHandler(e);
            }
            if (client._log.canSend(Logger_1.LogLevel.ERROR)) {
                console.error(e);
            }
        }
    }
    throw new Error(`Could not find the input entity for ${JSON.stringify(peer)}.
         Please read https://` +
        "docs.telethon.dev/en/stable/concepts/entities.html to" +
        " find out more details.");
}
exports.getInputEntity = getInputEntity;
/** @hidden */
async function _getEntityFromString(client, string) {
    const phone = __1.utils.parsePhone(string);
    if (phone) {
        try {
            const result = await client.invoke(new tl_1.Api.contacts.GetContacts({
                hash: big_integer_1.default.zero,
            }));
            if (!(result instanceof tl_1.Api.contacts.ContactsNotModified)) {
                for (const user of result.users) {
                    if (user instanceof tl_1.Api.User && user.phone === phone) {
                        return user;
                    }
                }
            }
        }
        catch (e) {
            if (e.errorMessage === "BOT_METHOD_INVALID") {
                throw new Error("Cannot get entity by phone number as a " +
                    "bot (try using integer IDs, not strings)");
            }
            throw e;
        }
    }
    const id = __1.utils.parseID(string);
    if (id != undefined) {
        return getInputEntity(client, id);
    }
    else if (["me", "this"].includes(string.toLowerCase())) {
        return client.getMe();
    }
    else {
        const { username, isInvite } = __1.utils.parseUsername(string);
        if (isInvite) {
            const invite = await client.invoke(new tl_1.Api.messages.CheckChatInvite({
                hash: username,
            }));
            if (invite instanceof tl_1.Api.ChatInvite) {
                throw new Error("Cannot get entity from a channel (or group) " +
                    "that you are not part of. Join the group and retry");
            }
            else if (invite instanceof tl_1.Api.ChatInviteAlready) {
                return invite.chat;
            }
        }
        else if (username) {
            try {
                const result = await client.invoke(new tl_1.Api.contacts.ResolveUsername({ username: username }));
                const pid = __1.utils.getPeerId(result.peer, false);
                if (result.peer instanceof tl_1.Api.PeerUser) {
                    for (const x of result.users) {
                        if ((0, Helpers_1.returnBigInt)(x.id).equals((0, Helpers_1.returnBigInt)(pid))) {
                            return x;
                        }
                    }
                }
                else {
                    for (const x of result.chats) {
                        if ((0, Helpers_1.returnBigInt)(x.id).equals((0, Helpers_1.returnBigInt)(pid))) {
                            return x;
                        }
                    }
                }
            }
            catch (e) {
                if (e.errorMessage === "USERNAME_NOT_OCCUPIED") {
                    throw new Error(`No user has "${username}" as username`);
                }
                throw e;
            }
        }
    }
    throw new Error(`Cannot find any entity corresponding to "${string}"`);
}
exports._getEntityFromString = _getEntityFromString;
/** @hidden */
async function getPeerId(client, peer, addMark = true) {
    if (typeof peer == "string") {
        const valid = (0, Utils_1.parseID)(peer);
        if (valid) {
            return __1.utils.getPeerId(peer, addMark);
        }
        else {
            peer = await client.getInputEntity(peer);
        }
    }
    if (typeof peer == "number" ||
        typeof peer == "bigint" ||
        big_integer_1.default.isInstance(peer)) {
        return __1.utils.getPeerId(peer, addMark);
    }
    if (peer.SUBCLASS_OF_ID == 0x2d45687 || peer.SUBCLASS_OF_ID == 0xc91c90b6) {
        peer = await client.getInputEntity(peer);
    }
    if (peer instanceof tl_1.Api.InputPeerSelf) {
        peer = await client.getMe(true);
    }
    return __1.utils.getPeerId(peer, addMark);
}
exports.getPeerId = getPeerId;
/** @hidden */
async function _getPeer(client, peer) {
    if (!peer) {
        return undefined;
    }
    const [i, cls] = __1.utils.resolveId((0, Helpers_1.returnBigInt)(await client.getPeerId(peer)));
    return new cls({
        userId: i,
        channelId: i,
        chatId: i,
    });
}
exports._getPeer = _getPeer;
/** @hidden */
async function _getInputDialog(client, dialog) {
    try {
        if (dialog.SUBCLASS_OF_ID == 0xa21c9795) {
            // crc32(b'InputDialogPeer')
            dialog.peer = await client.getInputEntity(dialog.peer);
            return dialog;
        }
        else if (dialog.SUBCLASS_OF_ID == 0xc91c90b6) {
            //crc32(b'InputPeer')
            return new tl_1.Api.InputDialogPeer({
                peer: dialog,
            });
        }
    }
    catch (e) { }
    return new tl_1.Api.InputDialogPeer({
        peer: dialog,
    });
}
exports._getInputDialog = _getInputDialog;
/** @hidden */
async function _getInputNotify(client, notify) {
    try {
        if (notify.SUBCLASS_OF_ID == 0x58981615) {
            if (notify instanceof tl_1.Api.InputNotifyPeer) {
                notify.peer = await client.getInputEntity(notify.peer);
            }
            return notify;
        }
    }
    catch (e) { }
    return new tl_1.Api.InputNotifyPeer({
        peer: await client.getInputEntity(notify),
    });
}
exports._getInputNotify = _getInputNotify;
/** @hidden */
function _selfId(client) {
    return client._selfInputPeer ? client._selfInputPeer.userId : undefined;
}
exports._selfId = _selfId;
