import { Api } from "../tl";
import type { Entity, EntityLike } from "../define";
import { ChatGetter } from "../tl/custom";
import type { TelegramClient } from "..";
import { SenderGetter } from "../tl/custom/senderGetter";
import bigInt from "big-integer";
/** @hidden */
export declare function _intoIdSet(client: TelegramClient, chats: EntityLike[] | EntityLike | undefined): Promise<string[] | undefined>;
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
export declare class EventBuilder {
    chats?: string[];
    blacklistChats: boolean;
    resolved: boolean;
    func?: CallableFunction;
    client?: TelegramClient;
    constructor(eventParams: DefaultEventInterface);
    build(update: Api.TypeUpdate, callback?: CallableFunction, selfId?: bigInt.BigInteger): any;
    resolve(client: TelegramClient): Promise<void>;
    _resolve(client: TelegramClient): Promise<void>;
    filter(event: EventCommon | EventCommonSender): undefined | EventCommon | EventCommonSender;
}
interface EventCommonInterface {
    chatPeer?: EntityLike;
    msgId?: number;
    broadcast?: boolean;
}
export declare class EventCommon extends ChatGetter {
    _eventName: string;
    _entities: Map<string, Entity>;
    _messageId?: number;
    constructor({ chatPeer, msgId, broadcast, }: EventCommonInterface);
    _setClient(client: TelegramClient): void;
    get client(): TelegramClient | undefined;
}
export declare class EventCommonSender extends SenderGetter {
    _eventName: string;
    _entities: Map<string, Entity>;
    _messageId?: number;
    constructor({ chatPeer, msgId, broadcast, }: EventCommonInterface);
    _setClient(client: TelegramClient): void;
    get client(): TelegramClient | undefined;
}
export {};
