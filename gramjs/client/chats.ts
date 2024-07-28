import type { TelegramClient } from "./TelegramClient";
import type { EntitiesLike, Entity, EntityLike, ValueOf } from "../define";
import {
    sleep,
    getMinBigInt,
    TotalList,
    betterConsoleLog,
    returnBigInt,
} from "../Helpers";
import { RequestIter } from "../requestIter";
import { helpers, utils } from "../";
import { Api } from "../tl";
import bigInt, { BigInteger, isInstance } from "big-integer";
import { inspect } from "../inspect";
import { getPeerId } from "../Utils";

const _MAX_PARTICIPANTS_CHUNK_SIZE = 200;
const _MAX_ADMIN_LOG_CHUNK_SIZE = 100;
const _MAX_PROFILE_PHOTO_CHUNK_SIZE = 100;

interface ChatActionInterface {
    delay: number;
    autoCancel: boolean;
}

class _ChatAction {
    static _str_mapping = {
        typing: new Api.SendMessageTypingAction(),
        contact: new Api.SendMessageChooseContactAction(),
        game: new Api.SendMessageGamePlayAction(),
        location: new Api.SendMessageGeoLocationAction(),

        "record-audio": new Api.SendMessageRecordAudioAction(),
        "record-voice": new Api.SendMessageRecordAudioAction(), //alias
        "record-round": new Api.SendMessageRecordRoundAction(),
        "record-video": new Api.SendMessageRecordVideoAction(),

        audio: new Api.SendMessageUploadAudioAction({ progress: 1 }),
        voice: new Api.SendMessageUploadAudioAction({ progress: 1 }), // alias
        song: new Api.SendMessageUploadAudioAction({ progress: 1 }), // alias
        round: new Api.SendMessageUploadRoundAction({ progress: 1 }),
        video: new Api.SendMessageUploadVideoAction({ progress: 1 }),

        photo: new Api.SendMessageUploadPhotoAction({ progress: 1 }),
        document: new Api.SendMessageUploadDocumentAction({ progress: 1 }),
        file: new Api.SendMessageUploadDocumentAction({ progress: 1 }), // alias

        cancel: new Api.SendMessageCancelAction(),
    };

    private _client: TelegramClient;
    private readonly _chat: EntityLike;
    private readonly _action: ValueOf<typeof _ChatAction._str_mapping>;
    private readonly _delay: number;
    private readonly autoCancel: boolean;
    private _request?: Api.AnyRequest;
    private _task: null;
    private _running: boolean;

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    constructor(
        client: TelegramClient,
        chat: EntityLike,
        action: ValueOf<typeof _ChatAction._str_mapping>,
        params: ChatActionInterface = {
            delay: 4,
            autoCancel: true,
        }
    ) {
        this._client = client;
        this._chat = chat;
        this._action = action;
        this._delay = params.delay;
        this.autoCancel = params.autoCancel;
        this._request = undefined;
        this._task = null;
        this._running = false;
    }

    async start() {
        this._request = new Api.messages.SetTyping({
            peer: this._chat,
            action: this._action,
        });
        this._running = true;
        this._update();
    }

    async stop() {
        this._running = false;
        if (this.autoCancel) {
            await this._client.invoke(
                new Api.messages.SetTyping({
                    peer: this._chat,
                    action: new Api.SendMessageCancelAction(),
                })
            );
        }
    }

    async _update() {
        while (this._running) {
            if (this._request != undefined) {
                await this._client.invoke(this._request);
            }
            await sleep(this._delay * 1000);
        }
    }

    progress(current: number, total: number) {
        if ("progress" in this._action) {
            this._action.progress = 100 * Math.round(current / total);
        }
    }
}

interface ParticipantsIterInterface {
    entity: EntityLike;
    filter: any;
    offset?: number;
    search?: string;
    showTotal?: boolean;
}

export class _ParticipantsIter extends RequestIter {
    private filterEntity: ((entity: Entity) => boolean) | undefined;
    private requests?: Api.channels.GetParticipants[];

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    async _init({
        entity,
        filter,
        offset,
        search,
        showTotal,
    }: ParticipantsIterInterface): Promise<boolean | void> {
        if (!offset) {
            offset = 0;
        }
        if (filter && filter.constructor === Function) {
            if (
                [
                    Api.ChannelParticipantsBanned,
                    Api.ChannelParticipantsKicked,
                    Api.ChannelParticipantsSearch,
                    Api.ChannelParticipantsContacts,
                ].includes(filter)
            ) {
                filter = new filter({
                    q: "",
                });
            } else {
                filter = new filter();
            }
        }
        entity = await this.client.getInputEntity(entity);
        const ty = helpers._entityType(entity);
        if (search && (filter || ty != helpers._EntityType.CHANNEL)) {
            // We need to 'search' ourselves unless we have a PeerChannel
            search = search.toLowerCase();
            this.filterEntity = (entity: Entity) => {
                return (
                    utils
                        .getDisplayName(entity)
                        .toLowerCase()
                        .includes(search!) ||
                    ("username" in entity ? entity.username || "" : "")
                        .toLowerCase()
                        .includes(search!)
                );
            };
        } else {
            this.filterEntity = (entity: Entity) => true;
        }
        // Only used for channels, but we should always set the attribute
        this.requests = [];
        if (ty == helpers._EntityType.CHANNEL) {
            if (showTotal) {
                const channel = await this.client.invoke(
                    new Api.channels.GetFullChannel({
                        channel: entity,
                    })
                );
                if (!(channel.fullChat instanceof Api.ChatFull)) {
                    this.total = channel.fullChat.participantsCount;
                }
            }
            if (this.total && this.total <= 0) {
                return false;
            }
            this.requests.push(
                new Api.channels.GetParticipants({
                    channel: entity,
                    filter:
                        filter ||
                        new Api.ChannelParticipantsSearch({
                            q: search || "",
                        }),
                    offset,
                    limit: _MAX_PARTICIPANTS_CHUNK_SIZE,
                    hash: bigInt.zero,
                })
            );
        } else if (ty == helpers._EntityType.CHAT) {
            if (!("chatId" in entity)) {
                throw new Error(
                    "Found chat without id " + JSON.stringify(entity)
                );
            }
            const full = await this.client.invoke(
                new Api.messages.GetFullChat({
                    chatId: entity.chatId,
                })
            );

            if (full.fullChat instanceof Api.ChatFull) {
                if (
                    !(
                        full.fullChat.participants instanceof
                        Api.ChatParticipantsForbidden
                    )
                ) {
                    this.total = full.fullChat.participants.participants.length;
                } else {
                    this.total = 0;
                    return false;
                }

                const users = new Map<string, Entity>();
                for (const user of full.users) {
                    users.set(user.id.toString(), user);
                }
                for (const participant of full.fullChat.participants
                    .participants) {
                    const user = users.get(participant.userId.toString())!;
                    if (!this.filterEntity(user)) {
                        continue;
                    }
                    (user as any).participant = participant;
                    this.buffer?.push(user);
                }
                return true;
            }
        } else {
            this.total = 1;
            if (this.limit != 0) {
                const user = await this.client.getEntity(entity);
                if (this.filterEntity(user)) {
                    (user as any).participant = undefined;
                    this.buffer?.push(user);
                }
            }
            return true;
        }
    }

    async _loadNextChunk(): Promise<boolean | undefined> {
        if (!this.requests?.length) {
            return true;
        }
        this.requests[0].limit = Math.min(
            this.limit - this.requests[0].offset,
            _MAX_PARTICIPANTS_CHUNK_SIZE
        );
        const results = [];
        for (const request of this.requests) {
            results.push(await this.client.invoke(request));
        }

        for (let i = this.requests.length - 1; i >= 0; i--) {
            const participants = results[i];
            if (
                participants instanceof
                    Api.channels.ChannelParticipantsNotModified ||
                !participants.users.length
            ) {
                this.requests.splice(i, 1);
                continue;
            }

            this.requests[i].offset += participants.participants.length;
            const users = new Map<string, Entity>();
            for (const user of participants.users) {
                users.set(user.id.toString(), user);
            }
            for (const participant of participants.participants) {
                if (!("userId" in participant)) {
                    continue;
                }
                const user = users.get(participant.userId.toString())!;
                if (this.filterEntity && !this.filterEntity(user)) {
                    continue;
                }
                (user as any).participant = participant;
                this.buffer?.push(user);
            }
        }
        return undefined;
    }

    [Symbol.asyncIterator](): AsyncIterator<Api.User, any, undefined> {
        return super[Symbol.asyncIterator]();
    }
}

interface _AdminLogFilterInterface {
    join?: boolean;
    leave?: boolean;
    invite?: boolean;
    restrict?: boolean;
    unrestrict?: boolean;
    ban?: boolean;
    unban?: boolean;
    promote?: boolean;
    demote?: boolean;
    info?: boolean;
    settings?: boolean;
    pinned?: boolean;
    edit?: boolean;
    delete?: boolean;
    groupCall?: boolean;
}

interface _AdminLogSearchInterface {
    admins?: EntitiesLike;
    search?: string;
    minId?: BigInteger;
    maxId?: BigInteger;
}

class _AdminLogIter extends RequestIter {
    private entity?: Api.TypeInputPeer;
    private request?: Api.channels.GetAdminLog;

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    async _init(
        entity: EntityLike,
        searchArgs?: _AdminLogSearchInterface,
        filterArgs?: _AdminLogFilterInterface
    ) {
        let eventsFilter = undefined;

        if (
            filterArgs &&
            Object.values(filterArgs).find((element) => element === true)
        ) {
            eventsFilter = new Api.ChannelAdminLogEventsFilter({
                ...filterArgs,
            });
        }
        this.entity = await this.client.getInputEntity(entity);
        const adminList = [];
        if (searchArgs && searchArgs.admins) {
            for (const admin of searchArgs.admins) {
                adminList.push(await this.client.getInputEntity(admin));
            }
        }
        this.request = new Api.channels.GetAdminLog({
            channel: this.entity,
            q: searchArgs?.search || "",
            minId: searchArgs?.minId,
            maxId: searchArgs?.maxId,
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
            entities.set(utils.getPeerId(entity), entity);
        }
        const eventIds = [];
        for (const e of r.events) {
            eventIds.push(e.id);
        }
        this.request.maxId = getMinBigInt([bigInt.zero, ...eventIds]);
        for (const ev of r.events) {
            if (
                ev.action instanceof Api.ChannelAdminLogEventActionEditMessage
            ) {
                // @ts-ignore
                // TODO ev.action.prevMessage._finishInit(this.client, entities, this.entity);
                // @ts-ignore
                // TODO ev.action.newMessage._finishInit(this.client, entities, this.entity);
            }
        }
    }
}

/**
 * Used in iterParticipant and getParticipant. all params are optional.
 */
export interface IterParticipantsParams {
    /** how many members to retrieve. defaults to Number.MAX_SAFE_INTEGER (everyone) */
    limit?: number;
    /** how many members to skip. defaults to 0 */
    offset?: number;
    /** a query string to filter participants based on their display names and usernames. defaults to "" (everyone) */
    search?: string;
    /** optional filter to be used. E.g only admins filter or only banned members filter. PS : some filters need more permissions. */
    filter?: Api.TypeChannelParticipantsFilter;
    /** whether to call an extra request (GetFullChannel) to show the total of users in the group/channel. if set to false total will be 0 */
    showTotal?: boolean;
}

/** @hidden */
export function iterParticipants(
    client: TelegramClient,
    entity: EntityLike,
    { limit, offset, search, filter, showTotal = true }: IterParticipantsParams
) {
    return new _ParticipantsIter(
        client,
        limit ?? Number.MAX_SAFE_INTEGER,
        {},
        {
            entity: entity,
            filter: filter,
            offset: offset ?? 0,
            search: search,
            showTotal: showTotal,
        }
    );
}

/** @hidden */
export async function getParticipants(
    client: TelegramClient,
    entity: EntityLike,
    params: IterParticipantsParams
) {
    const it = client.iterParticipants(entity, params);
    return (await it.collect()) as TotalList<Api.User>;
}

/** @hidden */
export async function kickParticipant(
    client: TelegramClient,
    entity: EntityLike,
    participant: EntityLike
) {
    const peer = await client.getInputEntity(entity);
    const user = await client.getInputEntity(participant);
    let resp;
    let request;

    const type = helpers._entityType(peer);
    if (type === helpers._EntityType.CHAT) {
        request = new Api.messages.DeleteChatUser({
            chatId: returnBigInt(getPeerId(entity)),
            userId: returnBigInt(getPeerId(participant)),
        });
        resp = await client.invoke(request);
    } else if (type === helpers._EntityType.CHANNEL) {
        if (user instanceof Api.InputPeerSelf) {
            request = new Api.channels.LeaveChannel({
                channel: peer,
            });
            resp = await client.invoke(request);
        } else {
            request = new Api.channels.EditBanned({
                channel: peer,
                participant: user,
                bannedRights: new Api.ChatBannedRights({
                    untilDate: 0,
                    viewMessages: true,
                }),
            });
            resp = await client.invoke(request);
            await sleep(500);
            await client.invoke(
                new Api.channels.EditBanned({
                    channel: peer,
                    participant: user,
                    bannedRights: new Api.ChatBannedRights({ untilDate: 0 }),
                })
            );
        }
    } else {
        throw new Error("You must pass either a channel or a chat");
    }
    return client._getResponseMessage(request, resp, entity);
}
