/// <reference types="node" />
import type { Entity, EntityLike } from "../../define";
import type { TelegramClient } from "../../client/TelegramClient";
import { inspect } from "../../inspect";
export interface ChatGetterConstructorParams {
    chatPeer?: EntityLike;
    inputChat?: EntityLike;
    chat?: EntityLike;
    broadcast?: boolean;
}
export declare class ChatGetter {
    _chatPeer?: EntityLike;
    _inputChat?: EntityLike;
    _chat?: Entity;
    _broadcast?: boolean;
    _client?: TelegramClient;
    [inspect.custom](): {
        [key: string]: any;
    };
    static initChatClass(c: any, { chatPeer, inputChat, chat, broadcast }: ChatGetterConstructorParams): void;
    get chat(): Entity | undefined;
    getChat(): Promise<Entity | undefined>;
    get inputChat(): EntityLike | undefined;
    getInputChat(): Promise<EntityLike | undefined>;
    get chatId(): import("big-integer").BigInteger | undefined;
    get isPrivate(): boolean | undefined;
    get isGroup(): boolean | undefined;
    get isChannel(): boolean;
    _refetchChat(): Promise<void>;
}
