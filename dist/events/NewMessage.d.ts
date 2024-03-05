import { DefaultEventInterface, EventBuilder, EventCommon } from "./common";
import type { Entity, EntityLike } from "../define";
import type { TelegramClient } from "..";
import { Api } from "../tl";
import bigInt from "big-integer";
export interface NewMessageInterface extends DefaultEventInterface {
    func?: {
        (event: NewMessageEvent): boolean;
    };
    /**
     * If set to `true`, only **incoming** messages will be handled.
     Mutually exclusive with ``outgoing`` (can only set one of either).
     */
    incoming?: boolean;
    /**
     * If set to `true`, only **outgoing** messages will be handled.
     * Mutually exclusive with ``incoming`` (can only set one of either).
     */
    outgoing?: boolean;
    /**
     * Unlike `chats`, this parameter filters the *senders* of the
     * message. That is, only messages *sent by these users* will be
     * handled. Use `chats` if you want private messages with this/these
     * users. `from_users` lets you filter by messages sent by *one or
     * more* users across the desired chats (doesn't need a list).
     */
    fromUsers?: EntityLike[];
    /**
     * Whether forwarded messages should be handled or not. By default,
     * both forwarded and normal messages are included. If it's `True`
     * **only** forwards will be handled. If it's `False` only messages
     * that are *not* forwards will be handled.
     */
    forwards?: boolean;
    /**
     *  If set, only messages matching this pattern will be handled.
     */
    pattern?: RegExp;
}
/**
 * Occurs whenever a new text message or a message with media arrives.
 * @example
 * ```ts
 * async function eventPrint(event: NewMessageEvent) {
 * const message = event.message;
 *
 *   // Checks if it's a private message (from user or bot)
 *   if (event.isPrivate){
 *       // prints sender id
 *       console.log(message.senderId);
 *       // read message
 *       if (message.text == "hello"){
 *           const sender = await message.getSender();
 *           console.log("sender is",sender);
 *           await client.sendMessage(sender,{
 *               message:`hi your id is ${message.senderId}`
 *           });
 *       }
 *   }
 * }
 * // adds an event handler for new messages
 * client.addEventHandler(eventPrint, new NewMessage({}));
 * ```
 */
export declare class NewMessage extends EventBuilder {
    func?: {
        (event: NewMessageEvent): boolean;
    };
    incoming?: boolean;
    outgoing?: boolean;
    fromUsers?: EntityLike[];
    forwards?: boolean;
    pattern?: RegExp;
    /** @hidden */
    private readonly _noCheck;
    constructor(newMessageParams?: NewMessageInterface);
    _resolve(client: TelegramClient): Promise<void>;
    build(update: Api.TypeUpdate | Api.TypeUpdates, callback: undefined, selfId: bigInt.BigInteger): NewMessageEvent | undefined;
    filter(event: NewMessageEvent): EventCommon | import("./common").EventCommonSender | undefined;
    addAttributes(update: any): void;
}
export declare class NewMessageEvent extends EventCommon {
    message: Api.Message;
    originalUpdate: (Api.TypeUpdate | Api.TypeUpdates) & {
        _entities?: Map<number, Entity>;
    };
    constructor(message: Api.Message, originalUpdate: Api.TypeUpdate | Api.TypeUpdates);
    _setClient(client: TelegramClient): void;
}
