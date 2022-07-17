import * as utils from "../../Utils";
import { AbstractTelegramClient } from "../../client/AbstractTelegramClient";
import { Api } from "../api";
import { betterConsoleLog, returnBigInt } from "../../Helpers";
import { inspect } from "../../inspect";

export interface ChatGetterConstructorParams {
    chatPeer?: Api.TypeEntityLike;
    inputChat?: Api.TypeEntityLike;
    chat?: Api.TypeEntityLike;
    broadcast?: boolean;
}

export class ChatGetter {
    _chatPeer?: Api.TypeEntityLike;
    _inputChat?: Api.TypeEntityLike;
    _chat?: Api.TypeEntity;
    _broadcast?: boolean;
    public _client?: AbstractTelegramClient;

    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    static initChatClass(
        c: any,
        { chatPeer, inputChat, chat, broadcast }: ChatGetterConstructorParams
    ) {
        c._chatPeer = chatPeer;
        c._inputChat = inputChat;
        c._chat = chat;
        c._broadcast = broadcast;
        c._client = undefined;
    }

    get chat() {
        return this._chat;
    }

    async getChat() {
        if (
            !this._chat ||
            ("min" in this._chat && (await this.getInputChat()))
        ) {
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
            try {
                this._inputChat = this._client._entityCache.get(
                    utils.getPeerId(this._chatPeer)
                );
            } catch (e) {}
        }
        return this._inputChat;
    }

    async getInputChat() {
        if (!this.inputChat && this.chatId && this._client) {
            try {
                const target = this.chatId;
                for await (const dialog of this._client.iterDialogs({
                    limit: 100,
                })) {
                    if (dialog.id!.eq(target!)) {
                        this._chat = dialog.entity;
                        this._inputChat = dialog.inputEntity;
                        break;
                    }
                }
            } catch (e) {
                // do nothing
            }
            return this._inputChat;
        }
        return this._inputChat;
    }

    get chatId() {
        return this._chatPeer
            ? returnBigInt(utils.getPeerId(this._chatPeer))
            : undefined;
    }

    get isPrivate() {
        return this._chatPeer
            ? this._chatPeer instanceof Api.PeerUser
            : undefined;
    }

    get isGroup() {
        if (!this._broadcast && this.chat && "broadcast" in this.chat) {
            this._broadcast = Boolean(this.chat.broadcast);
        }
        if (this._chatPeer instanceof Api.PeerChannel) {
            if (this._broadcast === undefined) {
                return undefined;
            } else {
                return !this._broadcast;
            }
        }
        return this._chatPeer instanceof Api.PeerChat;
    }

    get isChannel() {
        return this._chatPeer instanceof Api.PeerChannel;
    }

    async _refetchChat() {}
}
