import {
    _intoIdSet,
    DefaultEventInterface,
    EventBuilder,
    EventCommon,
} from "./common";
import type { Entity, EntityLike } from "../define";
import type { TelegramClient } from "..";
import { Api } from "../tl";
import bigInt from "big-integer";
import { LogLevel } from "../extensions/Logger";

export interface NewMessageInterface extends DefaultEventInterface {
    func?: { (event: NewMessageEvent): boolean };
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
export class NewMessage extends EventBuilder {
    func?: { (event: NewMessageEvent): boolean };
    incoming?: boolean;
    outgoing?: boolean;
    fromUsers?: EntityLike[];
    forwards?: boolean;
    pattern?: RegExp;

    /** @hidden */
    private readonly _noCheck: boolean;

    constructor(newMessageParams: NewMessageInterface = {}) {
        let {
            chats,
            func,
            incoming,
            outgoing,
            fromUsers,
            forwards,
            pattern,
            blacklistChats = false,
        } = newMessageParams;
        if (incoming && outgoing) {
            incoming = outgoing = undefined;
        } else if (incoming != undefined && outgoing == undefined) {
            outgoing = !incoming;
        } else if (outgoing != undefined && incoming == undefined) {
            incoming = !outgoing;
        } else if (outgoing == false && incoming == false) {
            throw new Error(
                "Don't create an event handler if you don't want neither incoming nor outgoing!"
            );
        }
        super({ chats, blacklistChats, func });
        this.incoming = incoming;
        this.outgoing = outgoing;
        this.fromUsers = fromUsers;
        this.forwards = forwards;
        this.pattern = pattern;
        this._noCheck = [
            incoming,
            outgoing,
            chats,
            pattern,
            fromUsers,
            forwards,
            func,
        ].every((v) => v == undefined);
    }

    async _resolve(client: TelegramClient) {
        await super._resolve(client);
        this.fromUsers = await _intoIdSet(client, this.fromUsers);
    }

    build(
        update: Api.TypeUpdate | Api.TypeUpdates,
        callback: undefined,
        selfId: bigInt.BigInteger
    ) {
        if (
            update instanceof Api.UpdateNewMessage ||
            update instanceof Api.UpdateNewChannelMessage
        ) {
            if (!(update.message instanceof Api.Message)) {
                return undefined;
            }
            const event = new NewMessageEvent(update.message, update);
            this.addAttributes(event);
            return event;
        } else if (update instanceof Api.UpdateShortMessage) {
            return new NewMessageEvent(
                new Api.Message({
                    out: update.out,
                    mentioned: update.mentioned,
                    mediaUnread: update.mediaUnread,
                    silent: update.silent,
                    id: update.id,
                    peerId: new Api.PeerUser({ userId: update.userId }),
                    fromId: new Api.PeerUser({
                        userId: update.out ? selfId : update.userId,
                    }),
                    message: update.message,
                    date: update.date,
                    fwdFrom: update.fwdFrom,
                    viaBotId: update.viaBotId,
                    replyTo: update.replyTo,
                    entities: update.entities,
                    ttlPeriod: update.ttlPeriod,
                }),
                update
            );
        } else if (update instanceof Api.UpdateShortChatMessage) {
            return new NewMessageEvent(
                new Api.Message({
                    out: update.out,
                    mentioned: update.mentioned,
                    mediaUnread: update.mediaUnread,
                    silent: update.silent,
                    id: update.id,
                    peerId: new Api.PeerChat({ chatId: update.chatId }),
                    fromId: new Api.PeerUser({
                        userId: update.out ? selfId : update.fromId,
                    }),
                    message: update.message,
                    date: update.date,
                    fwdFrom: update.fwdFrom,
                    viaBotId: update.viaBotId,
                    replyTo: update.replyTo,
                    entities: update.entities,
                    ttlPeriod: update.ttlPeriod,
                }),
                update
            );
        }
    }

    filter(event: NewMessageEvent) {
        if (this._noCheck) {
            return event;
        }
        if (this.incoming && event.message.out) {
            return;
        }
        if (this.outgoing && !event.message.out) {
            return;
        }
        if (this.forwards != undefined) {
            if (this.forwards != !!event.message.fwdFrom) {
                return;
            }
        }

        if (this.fromUsers != undefined) {
            if (
                !event.message.senderId ||
                !this.fromUsers.includes(event.message.senderId.toString())
            ) {
                return;
            }
        }

        if (this.pattern) {
            const match = event.message.message?.match(this.pattern);
            if (!match) {
                return;
            }
            event.message.patternMatch = match;
        }
        return super.filter(event);
    }

    addAttributes(update: any) {
        //update.patternMatch =
    }
}

export class NewMessageEvent extends EventCommon {
    message: Api.Message;
    originalUpdate: (Api.TypeUpdate | Api.TypeUpdates) & {
        _entities?: Map<number, Entity>;
    };

    constructor(
        message: Api.Message,
        originalUpdate: Api.TypeUpdate | Api.TypeUpdates
    ) {
        super({
            msgId: message.id,
            chatPeer: message.peerId,
            broadcast: message.post,
        });
        this.originalUpdate = originalUpdate;
        this.message = message;
    }

    _setClient(client: TelegramClient) {
        super._setClient(client);
        const m = this.message;
        try {
            // todo make sure this never fails
            m._finishInit(
                client,
                this.originalUpdate._entities || new Map(),
                undefined
            );
        } catch (e) {
            client._log.error(
                "Got error while trying to finish init message with id " + m.id
            );
            if (client._errorHandler) {
                client._errorHandler(e as Error);
            }
            if (client._log.canSend(LogLevel.ERROR)) {
                console.error(e);
            }
        }
    }
}
