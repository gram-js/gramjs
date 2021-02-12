import {TelegramClient} from "./TelegramClient";
import {EntitiesLike, Entity, EntityLike, ValueOf} from "../define";
// @ts-ignore
import {sleep, getMinBigInt} from '../Helpers';
import {RequestIter} from "../requestIter";
import {helpers, utils} from "../index";
import {Api} from "../tl/api";
import GetFullChannel = Api.channels.GetFullChannel;
import AnyRequest = Api.AnyRequest;
import SetTyping = Api.messages.SetTyping;
import GetParticipants = Api.channels.GetParticipants;
import ChannelParticipantsSearch = Api.ChannelParticipantsSearch;
import GetFullChat = Api.messages.GetFullChat;
import ChatParticipants = Api.ChatParticipants;
import ChannelParticipantsNotModified = Api.channels.ChannelParticipantsNotModified;
import ChannelAdminLogEventsFilter = Api.ChannelAdminLogEventsFilter;
import GetAdminLog = Api.channels.GetAdminLog;
import bigInt, {BigInteger} from "big-integer";
import ChannelAdminLogEventActionEditMessage = Api.ChannelAdminLogEventActionEditMessage;
import {AccountMethods} from "./account";
import {AuthMethods} from "./auth";
import {DownloadMethods} from "./downloads";
import {DialogMethods} from "./dialogs";
import {BotMethods} from "./bots";
import {MessageMethods} from "./messages";
import {ButtonMethods} from "./buttons";
import {UpdateMethods} from "./updates";
import {MessageParseMethods} from "./messageParse";
import {UserMethods} from "./users";
import {TelegramBaseClient} from "./telegramBaseClient";

const _MAX_PARTICIPANTS_CHUNK_SIZE = 200;
const _MAX_ADMIN_LOG_CHUNK_SIZE = 100;
const _MAX_PROFILE_PHOTO_CHUNK_SIZE = 100;

interface ChatActionInterface {
    delay: number,
    autoCancel: boolean,
}

class _ChatAction {
    static _str_mapping = {
        'typing': new Api.SendMessageTypingAction(),
        'contact': new Api.SendMessageChooseContactAction(),
        'game': new Api.SendMessageGamePlayAction(),
        'location': new Api.SendMessageGeoLocationAction(),

        'record-audio': new Api.SendMessageRecordAudioAction(),
        'record-voice': new Api.SendMessageRecordAudioAction(),  //alias
        'record-round': new Api.SendMessageRecordRoundAction(),
        'record-video': new Api.SendMessageRecordVideoAction(),

        'audio': new Api.SendMessageUploadAudioAction({progress: 1,}),
        'voice': new Api.SendMessageUploadAudioAction({progress: 1,}),  // alias
        'song': new Api.SendMessageUploadAudioAction({progress: 1,}), // alias
        'round': new Api.SendMessageUploadRoundAction({progress: 1,}),
        'video': new Api.SendMessageUploadVideoAction({progress: 1,}),

        'photo': new Api.SendMessageUploadPhotoAction({progress: 1,}),
        'document': new Api.SendMessageUploadDocumentAction({progress: 1,}),
        'file': new Api.SendMessageUploadDocumentAction({progress: 1,}),  // alias

        'cancel': new Api.SendMessageCancelAction()
    };

    private _client: TelegramClient;
    private _chat: EntityLike;
    private _action: ValueOf<typeof _ChatAction._str_mapping>;
    private _delay: number;
    private autoCancel: boolean;
    private _request?: AnyRequest;
    private _task: null;
    private _running: boolean;

    constructor(client: TelegramClient, chat: EntityLike, action: ValueOf<typeof _ChatAction._str_mapping>, params: ChatActionInterface = {
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

    async start() {
        this._request = new SetTyping({
            peer: this._chat,
            action: this._action
        });
        this._running = true;
        this._update();
    }

    async stop() {
        this._running = false;
        if (this.autoCancel) {
            await this._client.invoke(new SetTyping({
                peer: this._chat,
                action: new Api.SendMessageCancelAction()
            }));
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
        if ('progress' in this._action) {
            this._action.progress = 100 * Math.round(current / total)
        }

    }
}

class _ParticipantsIter extends RequestIter {
    private filterEntity: ((entity: Entity) => boolean) | undefined;
    private requests?: GetParticipants[];

    async _init(entity: EntityLike, filter: any, search?: string): Promise<boolean | void> {
        if (filter.constructor === Function) {
            if ([Api.ChannelParticipantsBanned, Api.ChannelParticipantsKicked, Api.ChannelParticipantsSearch, Api.ChannelParticipantsContacts].includes(filter)) {
                filter = new filter({
                    q: '',
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
                return utils.getDisplayName(entity).toLowerCase().includes(<string>search) ||
                    ('username' in entity ? entity.username || '' : '').toLowerCase().includes(<string>search)
            }
        } else {
            this.filterEntity = (entity: Entity) => true;
        }
        // Only used for channels, but we should always set the attribute
        this.requests = [];
        if (ty == helpers._EntityType.CHANNEL) {
            const channel = (await this.client.invoke(new GetFullChannel({
                channel: entity
            })));
            if (!(channel.fullChat instanceof Api.ChatFull)) {
                this.total = channel.fullChat.participantsCount;
            }
            if (this.total && this.total <= 0) {
                return false;
            }
            this.requests.push(new GetParticipants({
                channel: entity,
                filter: filter || new ChannelParticipantsSearch({
                    q: search || '',
                }),
                offset: 0,
                limit: _MAX_PARTICIPANTS_CHUNK_SIZE,
                hash: 0,
            }))
        } else if (ty == helpers._EntityType.CHAT) {
            const full = await this.client.invoke(new GetFullChat({
                chatId: entity.chatId
            }));

            if (full.fullChat instanceof Api.ChatFull) {
                if (!(full.fullChat.participants instanceof Api.ChatParticipantsForbidden)) {
                    this.total = full.fullChat.participants.participants.length;
                } else {
                    this.total = 0;
                    return false;
                }

                const users = new Map();
                for (const user of full.users) {
                    users.set(user.id, user);
                }
                for (const participant of full.fullChat.participants.participants) {
                    const user = users.get(participant.userId);
                    if (!this.filterEntity(user)) {
                        continue;
                    }
                    user.participant = participant;
                    this.buffer?.push(user);
                }
                return true;
            }

        } else {
            this.total = 1;
            if (this.limit != 0) {
                const user = await this.client.getEntity(entity);
                if (this.filterEntity(user)) {
                    // @ts-ignore
                    user.participant = null;
                    this.buffer?.push(user);
                }
            }
            return true;
        }
    }

    async _loadNextChunk(): Promise<boolean | undefined> {
        if (!this.requests) {
            return true;
        }
        this.requests[0].limit = Math.min(
            this.limit - this.requests[0].offset, _MAX_PARTICIPANTS_CHUNK_SIZE
        );
        if (this.requests[0].offset > this.limit) {
            return true;
        }
        const results = [];
        for (const request of this.requests) {
            results.push(
                await this.client.invoke(request)
            );
        }
        for (let i = this.requests.length; i > 0; i--) {
            const participants = results[i];
            if (participants instanceof ChannelParticipantsNotModified || !participants.users) {
                this.requests.splice(i, 1);
                continue;
            }
            this.requests[i].offset += participants.participants.length;
            const users = new Map();
            for (const user of participants.users) {
                users.set(user.id, user);
            }
            for (const participant of participants.participants) {
                const user = users.get(participant.userId);
                if (this.filterEntity && !this.filterEntity(user)) {
                    continue;
                }
                user.participant = participant;
                this.buffer?.push(user);
            }
        }
        return undefined;
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

    async _init(entity: EntityLike, searchArgs?: _AdminLogSearchInterface, filterArgs?: _AdminLogFilterInterface) {
        let eventsFilter = undefined;

        if (filterArgs && Object.values(filterArgs).find(element => element === true)) {
            eventsFilter = new ChannelAdminLogEventsFilter({
                ...filterArgs
            });
        }
        this.entity = await this.client.getInputEntity(entity);
        const adminList = []
        if (searchArgs && searchArgs.admins) {
            for (const admin of searchArgs.admins) {
                adminList.push(await this.client.getInputEntity(admin))
            }
        }
        this.request = new GetAdminLog({
                channel: this.entity,
                q: searchArgs?.search || '',
                minId: searchArgs?.minId,
                maxId: searchArgs?.maxId,
                limit: 0,
                eventsFilter: eventsFilter,
                admins: adminList || undefined,
            }
        )
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
            if (ev.action instanceof ChannelAdminLogEventActionEditMessage) {
                // @ts-ignore
                ev.action.prevMessage._finishInit(this.client, entities, this.entity);
                // @ts-ignore
                ev.action.newMessage._finishInit(this.client, entities, this.entity);

            }
        }
    }
}

export class ChatMethods {
    // TODO implement
}
