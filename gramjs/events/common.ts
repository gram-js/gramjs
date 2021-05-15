import {Api} from "../tl";
import type {EntityLike} from "../define";
import {ChatGetter} from "../tl/custom";
import type {TelegramClient} from "../client/TelegramClient";

import bigInt from "big-integer";
import {isArrayLike} from "../Helpers";
import {utils} from "../";
import {Message} from "../tl/patched";

export async function _intoIdSet(client: TelegramClient, chats: EntityLike[] | EntityLike | undefined): Promise<number[] | undefined> {
    if (chats == undefined) {
        return undefined;
    }
    if (!isArrayLike(chats)) {
        chats = [chats]
    }
    const result: Set<number> = new Set<number>();
    for (let chat of chats) {
        if (typeof chat == "number") {
            if (chat < 0) {
                result.add(chat);
            } else {
                result.add(utils.getPeerId(new Api.PeerUser({
                    userId: chat,
                })));
                result.add(utils.getPeerId(new Api.PeerChat({
                    chatId: chat,
                })));
                result.add(utils.getPeerId(new Api.PeerChannel({
                    channelId: chat,
                })));

            }
        } else if (typeof chat == "object" && chat.SUBCLASS_OF_ID == 0x2d45687) {
            result.add(utils.getPeerId(chat));
        } else {
            chat = await client.getInputEntity(chat);
            if (chat instanceof Api.InputPeerSelf) {
                chat = await client.getMe(true);
            }
            result.add(utils.getPeerId(chat));
        }
    }
    return Array.from(result);
}

interface DefaultEventInterface {
    chats?: EntityLike[],
    blacklistChats?: boolean,
    func?: CallableFunction,

}

export class EventBuilder {
    chats?: EntityLike[];
    private blacklistChats: boolean;
    resolved: boolean;
    func?: CallableFunction;

    constructor({chats, blacklistChats = true, func}: DefaultEventInterface) {
        this.chats = chats;
        this.blacklistChats = blacklistChats;
        this.resolved = false;
        this.func = func
    }

    build(update: Api.TypeUpdate, others = null): any {
        if (update)
            return update;
    }

    async resolve(client: TelegramClient) {
        if (this.resolved) {
            return
        }
        await this._resolve(client);
        this.resolved = true;
    }

    async _resolve(client: TelegramClient) {
        this.chats = await _intoIdSet(client, this.chats);
    }

    filter(event: any): undefined | EventBuilder {
        if (!this.resolved) {
            return
        }
        if (this.chats != undefined && event.chatId != undefined) {
            const inside = this.chats.includes(event.chatId);
            if (inside == this.blacklistChats) {
                // If this chat matches but it's a blacklist ignore.
                // If it doesn't match but it's a whitelist ignore.
                return;

            }
        }
        return event;
    }
}

interface EventCommonInterface {
    chatPeer?: EntityLike,
    msgId?: number,
    broadcast?: boolean,
}

export class EventCommon extends ChatGetter {
    _eventName = "Event";
    _entities: any;
    _messageId?: number;

    constructor({chatPeer = undefined, msgId = undefined, broadcast = undefined}: EventCommonInterface) {
        super({chatPeer, broadcast});
        this._entities = {};
        this._client = undefined;
        this._messageId = msgId;
    }

    _setClient(client: TelegramClient) {
        this._client = client;
    }

    get client() {
        return this._client;
    }

}

