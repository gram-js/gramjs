import {Entity, EntityLike} from "../../define";
import {TelegramClient} from "../../client/TelegramClient";
import {utils} from "../../index";
import {Api} from "../api";
import PeerUser = Api.PeerUser;
import PeerChannel = Api.PeerChannel;
import PeerChat = Api.PeerChat;

interface ChatGetterConstructorParams {
    chatPeer?: EntityLike;
    inputChat?: EntityLike;
    chat?: EntityLike;
    broadcast?: boolean;
}

export class ChatGetter {
     _chatPeer?: EntityLike;
     _inputChat?: EntityLike;
     _chat?: Entity;
     _broadcast?: boolean;
    public _client?: TelegramClient;

    constructor({chatPeer, inputChat, chat, broadcast}: ChatGetterConstructorParams) {
        ChatGetter.initClass(this, {chatPeer, inputChat, chat, broadcast});
    }

    static initClass(c: any, {chatPeer, inputChat, chat, broadcast}: ChatGetterConstructorParams) {
        c._chatPeer = chatPeer;
        c._inputChat = inputChat;
        c._chat = chat;
        c._broadcast = broadcast;
        c._client = undefined
    }


    get chat() {
        return this._chat;
    }

    async getChat() {
        if (!this._chat || 'min' in this._chat && await this.getInputChat()) {
            try {
                if (this._inputChat) {
                    this._chat = await this._client?.getEntity(this._inputChat);
                }
            } catch (e) {
                await this._refetchChat();
            }
        }
        return this._chat;
    }

    get inputChat() {
        if (!this._inputChat && this._chatPeer && this._client) {
            this._inputChat = this._client._entityCache.get(this._chatPeer);
        }
        return this._inputChat;
    }

    async getInputChat() {/*
        if (!this._inputChat && this.chatId && this._client) {
            try {
                const target = this.chatId;
                for await (const dialog of this._client.iterDialogs(100)) {
                    if (dialog.id === target) {
                        this._chat = dialog.entity;
                        this._inputChat = dialog.inputEntity;
                        break;
                    }
                }
            } catch (e) {
                // do nothing
            }
            return this._inputChat;
        }*/
        return this._inputChat;
    }

    get chatId() {
        return this._chatPeer ? utils.getPeerId(this._chatPeer) : undefined;
    }

    get is() {
        return this._chatPeer ? this._chatPeer instanceof PeerUser : undefined;
    }

    get isGroup() {
        if (!this._broadcast && this.chat && 'broadcast' in this.chat) {
            this._broadcast = Boolean(this.chat.broadcast);
        }
        if (this._chatPeer instanceof PeerChannel) {
            if (this._broadcast === undefined) {
                return undefined;
            } else {
                return !this._broadcast;
            }
        }
        return this._chatPeer instanceof PeerChat;
    }

    get isChannel() {
        return this._chatPeer instanceof PeerChannel;
    }

    async _refetchChat() {
    }
}
