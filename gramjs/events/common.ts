import { Api } from "../tl";
import type { Entity, EntityLike } from "../define";
import { ChatGetter } from "../tl/custom";
import type { TelegramClient } from "..";

import { isArrayLike } from "../Helpers";
import { utils } from "../";

/** @hidden */
export async function _intoIdSet(
    client: TelegramClient,
    chats: EntityLike[] | EntityLike | undefined
): Promise<number[] | undefined> {
    if (chats == undefined) {
        return undefined;
    }
    if (!isArrayLike(chats)) {
        chats = [chats];
    }
    const result: Set<number> = new Set<number>();
    for (let chat of chats) {
        if (typeof chat == "number") {
            if (chat < 0) {
                result.add(chat);
            } else {
                result.add(
                    utils.getPeerId(
                        new Api.PeerUser({
                            userId: chat,
                        })
                    )
                );
                result.add(
                    utils.getPeerId(
                        new Api.PeerChat({
                            chatId: chat,
                        })
                    )
                );
                result.add(
                    utils.getPeerId(
                        new Api.PeerChannel({
                            channelId: chat,
                        })
                    )
                );
            }
        } else if (
            typeof chat == "object" &&
            chat.SUBCLASS_OF_ID == 0x2d45687
        ) {
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

export interface DefaultEventInterface {
    /**
     * May be one or more entities (username/peer/etc.), preferably IDs.<br/>
     * By default, only matching chats will be handled.
     */
    chats?: EntityLike[];
    /**
     * Whether to treat the chats as a blacklist instead of as a whitelist (default).<br/>
     * This means that every chat will be handled *except* those specified in ``chats``<br/>
     * which will be ignored if ``blacklistChats:true``.
     */
    blacklistChats?: boolean;
    /**
     * A callable function that should accept the event as input
     * parameter, and return a value indicating whether the event
     * should be dispatched or not (any truthy value will do, it
     * does not need to be a `bool`). It works like a custom filter:
     */
    func?: CallableFunction;
}

/**
 * The common event builder, with builtin support to filter per chat.<br/>
 * All events inherit this.
 */
export class EventBuilder {
    chats?: EntityLike[];
    blacklistChats: boolean;
    resolved: boolean;
    func?: CallableFunction;
    client?: TelegramClient;

    constructor(eventParams: DefaultEventInterface) {
        this.chats = eventParams.chats;
        this.blacklistChats = eventParams.blacklistChats || false;
        this.resolved = false;
        this.func = eventParams.func;
    }

    build(
        update: Api.TypeUpdate,
        others?: any,
        callback?: CallableFunction
    ): any {
        if (update) return update;
    }

    async resolve(client: TelegramClient) {
        if (this.resolved) {
            return;
        }
        await this._resolve(client);
        this.resolved = true;
    }

    async _resolve(client: TelegramClient) {
        this.chats = await _intoIdSet(client, this.chats);
    }

    filter(event: EventCommon): undefined | EventCommon {
        if (!this.resolved) {
            return;
        }
        if (this.chats != undefined) {
            if (event.chatId == undefined) {
                return;
            }
            const inside = this.chats.includes(event.chatId);
            if (inside == this.blacklistChats) {
                // If this chat matches but it's a blacklist ignore.
                // If it doesn't match but it's a whitelist ignore.
                return;
            }
        }
        if (this.func && !this.func(event)) {
            return;
        }
        return event;
    }
}

interface EventCommonInterface {
    chatPeer?: EntityLike;
    msgId?: number;
    broadcast?: boolean;
}

export class EventCommon extends ChatGetter {
    _eventName = "Event";
    _entities: Map<number, Entity>;
    _messageId?: number;

    constructor({
        chatPeer = undefined,
        msgId = undefined,
        broadcast = undefined,
    }: EventCommonInterface) {
        super();
        ChatGetter.initChatClass(this, { chatPeer, broadcast });
        this._entities = new Map();
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
