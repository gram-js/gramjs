import {_intoIdSet, EventBuilder, EventCommon} from "./common";
import type {EntityLike} from "../define";
import type {TelegramClient} from "../client/TelegramClient";
import {Api} from "../tl";
import {Message} from "../tl/patched";
import {Mixin} from 'ts-mixer';

interface NewMessageInterface {
    chats?: EntityLike[],
    func?: CallableFunction,
    incoming?: boolean,
    outgoing?: boolean,
    fromUsers?: EntityLike[],
    forwards?: boolean,
    pattern?: RegExp,
    blacklistChats?: boolean
}

export class NewMessage extends EventBuilder {
    chats?: EntityLike[];
    func?: CallableFunction;
    incoming?: boolean;
    outgoing?: boolean;
    fromUsers?: EntityLike[];
    forwards?: boolean;
    pattern?: RegExp;
    private _noCheck: boolean;

    constructor({chats, func, incoming, outgoing, fromUsers, forwards, pattern, blacklistChats = true}: NewMessageInterface) {
        if (incoming && outgoing) {
            incoming = outgoing = undefined;
        } else if (incoming != undefined && outgoing == undefined) {
            outgoing = !incoming;
        } else if (outgoing != undefined && incoming == undefined) {
            incoming = !outgoing;
        } else if (outgoing == false && incoming == false) {
            throw new Error("Don't create an event handler if you don't want neither incoming nor outgoing!")
        }
        super({chats, blacklistChats, func});
        this.incoming = incoming;
        this.outgoing = outgoing;
        this.fromUsers = fromUsers;
        this.forwards = forwards;
        this.pattern = pattern;
        this._noCheck = [incoming, outgoing, fromUsers, forwards, pattern].every(v => v == undefined);

    }

    async _resolve(client: TelegramClient) {
        await super._resolve(client);
        this.fromUsers = await _intoIdSet(client, this.fromUsers);
    }

    build(update: Api.TypeUpdate, others: any = null) {
        if (update instanceof Api.UpdateNewMessage || update instanceof Api.UpdateNewChannelMessage) {
            if (!(update.message instanceof Api.Message) && !(update.message instanceof Message)) {
                return undefined;
            }
            const event = new NewMessageEvent(update.message as Message, update);
            this.addAttributes(event);
            return event;
        } else if (update instanceof Api.UpdateShortMessage) {
            return new NewMessageEvent(new Message({
                out: update.out,
                mentioned: update.mentioned,
                mediaUnread: update.mediaUnread,
                silent: update.silent,
                id: update.id,
                peerId: new Api.PeerUser({userId: update.userId}),
                fromId: new Api.PeerUser({userId: update.userId}),
                message: update.message,
                date: update.date,
                fwdFrom: update.fwdFrom,
                viaBotId: update.viaBotId,
                replyTo: update.replyTo,
                entities: update.entities,
                // ttlPeriod:update.ttlPeriod
            }), update)
        } else if (update instanceof Api.UpdateShortChatMessage) {
            return new NewMessageEvent(new Message({
                out: update.out,
                mentioned: update.mentioned,
                mediaUnread: update.mediaUnread,
                silent: update.silent,
                id: update.id,
                peerId: new Api.PeerChat({chatId: update.chatId}),
                fromId: new Api.PeerUser({userId: update.fromId}),
                message: update.message,
                date: update.date,
                fwdFrom: update.fwdFrom,
                viaBotId: update.viaBotId,
                replyTo: update.replyTo,
                entities: update.entities,
                // ttlPeriod:update.ttlPeriod
            }), update)
        }
    }

    filter(event: NewMessageEvent): any {
        if (this._noCheck) {
            return event;
        }
        if (this.incoming && event.message.out) {
            return
        }
        if (this.outgoing && !event.message.out) {
            return;
        }
        if (this.forwards != undefined) {
            if (this.forwards != !!event.message.fwdFrom) {
                return;
            }
        }
        if (this.pattern) {
            const match = event.message.message.match(this.pattern);
            if (!match) {
                return
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
    message: Message;
    originalUpdate: Api.TypeUpdate;

    constructor(message: Message, originalUpdate: Api.TypeUpdate) {
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
            m._finishInit(client, this.message._entities, undefined);
        } catch (e) {

        }
    }
}
