"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParticipants = exports.iterParticipants = exports._ParticipantsIter = void 0;
const Helpers_1 = require("../Helpers");
const requestIter_1 = require("../requestIter");
const __1 = require("../");
const tl_1 = require("../tl");
const big_integer_1 = __importDefault(require("big-integer"));
const inspect_1 = require("../inspect");
const _MAX_PARTICIPANTS_CHUNK_SIZE = 200;
const _MAX_ADMIN_LOG_CHUNK_SIZE = 100;
const _MAX_PROFILE_PHOTO_CHUNK_SIZE = 100;
class _ChatAction {
    constructor(client, chat, action, params = {
        delay: 4,
        autoCancel: true,
    }) {
        this._client = client;
        this._chat = chat;
        this._action = action;
        this._delay = params.delay;
        this.autoCancel = params.autoCancel;
        this._request = undefined;
        this._task = null;
        this._running = false;
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    async start() {
        this._request = new tl_1.Api.messages.SetTyping({
            peer: this._chat,
            action: this._action,
        });
        this._running = true;
        this._update();
    }
    async stop() {
        this._running = false;
        if (this.autoCancel) {
            await this._client.invoke(new tl_1.Api.messages.SetTyping({
                peer: this._chat,
                action: new tl_1.Api.SendMessageCancelAction(),
            }));
        }
    }
    async _update() {
        while (this._running) {
            if (this._request != undefined) {
                await this._client.invoke(this._request);
            }
            await (0, Helpers_1.sleep)(this._delay * 1000);
        }
    }
    progress(current, total) {
        if ("progress" in this._action) {
            this._action.progress = 100 * Math.round(current / total);
        }
    }
}
_ChatAction._str_mapping = {
    typing: new tl_1.Api.SendMessageTypingAction(),
    contact: new tl_1.Api.SendMessageChooseContactAction(),
    game: new tl_1.Api.SendMessageGamePlayAction(),
    location: new tl_1.Api.SendMessageGeoLocationAction(),
    "record-audio": new tl_1.Api.SendMessageRecordAudioAction(),
    "record-voice": new tl_1.Api.SendMessageRecordAudioAction(),
    "record-round": new tl_1.Api.SendMessageRecordRoundAction(),
    "record-video": new tl_1.Api.SendMessageRecordVideoAction(),
    audio: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }),
    voice: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }),
    song: new tl_1.Api.SendMessageUploadAudioAction({ progress: 1 }),
    round: new tl_1.Api.SendMessageUploadRoundAction({ progress: 1 }),
    video: new tl_1.Api.SendMessageUploadVideoAction({ progress: 1 }),
    photo: new tl_1.Api.SendMessageUploadPhotoAction({ progress: 1 }),
    document: new tl_1.Api.SendMessageUploadDocumentAction({ progress: 1 }),
    file: new tl_1.Api.SendMessageUploadDocumentAction({ progress: 1 }),
    cancel: new tl_1.Api.SendMessageCancelAction(),
};
class _ParticipantsIter extends requestIter_1.RequestIter {
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    async _init({ entity, filter, offset, search, showTotal, }) {
        var _a, _b;
        if (!offset) {
            offset = 0;
        }
        if (filter && filter.constructor === Function) {
            if ([
                tl_1.Api.ChannelParticipantsBanned,
                tl_1.Api.ChannelParticipantsKicked,
                tl_1.Api.ChannelParticipantsSearch,
                tl_1.Api.ChannelParticipantsContacts,
            ].includes(filter)) {
                filter = new filter({
                    q: "",
                });
            }
            else {
                filter = new filter();
            }
        }
        entity = await this.client.getInputEntity(entity);
        const ty = __1.helpers._entityType(entity);
        if (search && (filter || ty != __1.helpers._EntityType.CHANNEL)) {
            // We need to 'search' ourselves unless we have a PeerChannel
            search = search.toLowerCase();
            this.filterEntity = (entity) => {
                return (__1.utils
                    .getDisplayName(entity)
                    .toLowerCase()
                    .includes(search) ||
                    ("username" in entity ? entity.username || "" : "")
                        .toLowerCase()
                        .includes(search));
            };
        }
        else {
            this.filterEntity = (entity) => true;
        }
        // Only used for channels, but we should always set the attribute
        this.requests = [];
        if (ty == __1.helpers._EntityType.CHANNEL) {
            if (showTotal) {
                const channel = await this.client.invoke(new tl_1.Api.channels.GetFullChannel({
                    channel: entity,
                }));
                if (!(channel.fullChat instanceof tl_1.Api.ChatFull)) {
                    this.total = channel.fullChat.participantsCount;
                }
            }
            if (this.total && this.total <= 0) {
                return false;
            }
            this.requests.push(new tl_1.Api.channels.GetParticipants({
                channel: entity,
                filter: filter ||
                    new tl_1.Api.ChannelParticipantsSearch({
                        q: search || "",
                    }),
                offset,
                limit: _MAX_PARTICIPANTS_CHUNK_SIZE,
                hash: big_integer_1.default.zero,
            }));
        }
        else if (ty == __1.helpers._EntityType.CHAT) {
            if (!("chatId" in entity)) {
                throw new Error("Found chat without id " + JSON.stringify(entity));
            }
            const full = await this.client.invoke(new tl_1.Api.messages.GetFullChat({
                chatId: entity.chatId,
            }));
            if (full.fullChat instanceof tl_1.Api.ChatFull) {
                if (!(full.fullChat.participants instanceof
                    tl_1.Api.ChatParticipantsForbidden)) {
                    this.total = full.fullChat.participants.participants.length;
                }
                else {
                    this.total = 0;
                    return false;
                }
                const users = new Map();
                for (const user of full.users) {
                    users.set(user.id.toString(), user);
                }
                for (const participant of full.fullChat.participants
                    .participants) {
                    const user = users.get(participant.userId.toString());
                    if (!this.filterEntity(user)) {
                        continue;
                    }
                    user.participant = participant;
                    (_a = this.buffer) === null || _a === void 0 ? void 0 : _a.push(user);
                }
                return true;
            }
        }
        else {
            this.total = 1;
            if (this.limit != 0) {
                const user = await this.client.getEntity(entity);
                if (this.filterEntity(user)) {
                    user.participant = undefined;
                    (_b = this.buffer) === null || _b === void 0 ? void 0 : _b.push(user);
                }
            }
            return true;
        }
    }
    async _loadNextChunk() {
        var _a, _b;
        if (!((_a = this.requests) === null || _a === void 0 ? void 0 : _a.length)) {
            return true;
        }
        this.requests[0].limit = Math.min(this.limit - this.requests[0].offset, _MAX_PARTICIPANTS_CHUNK_SIZE);
        const results = [];
        for (const request of this.requests) {
            results.push(await this.client.invoke(request));
        }
        for (let i = this.requests.length - 1; i >= 0; i--) {
            const participants = results[i];
            if (participants instanceof
                tl_1.Api.channels.ChannelParticipantsNotModified ||
                !participants.users.length) {
                this.requests.splice(i, 1);
                continue;
            }
            this.requests[i].offset += participants.participants.length;
            const users = new Map();
            for (const user of participants.users) {
                users.set(user.id.toString(), user);
            }
            for (const participant of participants.participants) {
                if (!("userId" in participant)) {
                    continue;
                }
                const user = users.get(participant.userId.toString());
                if (this.filterEntity && !this.filterEntity(user)) {
                    continue;
                }
                user.participant = participant;
                (_b = this.buffer) === null || _b === void 0 ? void 0 : _b.push(user);
            }
        }
        return undefined;
    }
    [Symbol.asyncIterator]() {
        return super[Symbol.asyncIterator]();
    }
}
exports._ParticipantsIter = _ParticipantsIter;
class _AdminLogIter extends requestIter_1.RequestIter {
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    async _init(entity, searchArgs, filterArgs) {
        let eventsFilter = undefined;
        if (filterArgs &&
            Object.values(filterArgs).find((element) => element === true)) {
            eventsFilter = new tl_1.Api.ChannelAdminLogEventsFilter(Object.assign({}, filterArgs));
        }
        this.entity = await this.client.getInputEntity(entity);
        const adminList = [];
        if (searchArgs && searchArgs.admins) {
            for (const admin of searchArgs.admins) {
                adminList.push(await this.client.getInputEntity(admin));
            }
        }
        this.request = new tl_1.Api.channels.GetAdminLog({
            channel: this.entity,
            q: (searchArgs === null || searchArgs === void 0 ? void 0 : searchArgs.search) || "",
            minId: searchArgs === null || searchArgs === void 0 ? void 0 : searchArgs.minId,
            maxId: searchArgs === null || searchArgs === void 0 ? void 0 : searchArgs.maxId,
            limit: 0,
            eventsFilter: eventsFilter,
            admins: adminList || undefined,
        });
    }
    async _loadNextChunk() {
        if (!this.request) {
            return true;
        }
        this.request.limit = Math.min(this.left, _MAX_ADMIN_LOG_CHUNK_SIZE);
        const r = await this.client.invoke(this.request);
        const entities = new Map();
        for (const entity of [...r.users, ...r.chats]) {
            entities.set(__1.utils.getPeerId(entity), entity);
        }
        const eventIds = [];
        for (const e of r.events) {
            eventIds.push(e.id);
        }
        this.request.maxId = (0, Helpers_1.getMinBigInt)([big_integer_1.default.zero, ...eventIds]);
        for (const ev of r.events) {
            if (ev.action instanceof tl_1.Api.ChannelAdminLogEventActionEditMessage) {
                // @ts-ignore
                // TODO ev.action.prevMessage._finishInit(this.client, entities, this.entity);
                // @ts-ignore
                // TODO ev.action.newMessage._finishInit(this.client, entities, this.entity);
            }
        }
    }
}
/** @hidden */
function iterParticipants(client, entity, { limit, offset, search, filter, showTotal = true }) {
    return new _ParticipantsIter(client, limit !== null && limit !== void 0 ? limit : Number.MAX_SAFE_INTEGER, {}, {
        entity: entity,
        filter: filter,
        offset: offset !== null && offset !== void 0 ? offset : 0,
        search: search,
        showTotal: showTotal,
    });
}
exports.iterParticipants = iterParticipants;
/** @hidden */
async function getParticipants(client, entity, params) {
    const it = client.iterParticipants(entity, params);
    return (await it.collect());
}
exports.getParticipants = getParticipants;
