import type { Entity } from "../../define";
import type { TelegramClient } from "../../client/TelegramClient";
import { Api } from "../api";

interface SenderGetterConstructorInterface {
    senderId?: number;
    sender?: Entity;
    inputSender?: Api.TypeInputPeer;
}

export class SenderGetter {
    _senderId?: number;
    _sender?: Entity;
    _inputSender?: Api.TypeInputPeer;
    public _client?: TelegramClient;

    constructor({
        senderId,
        sender,
        inputSender,
    }: SenderGetterConstructorInterface) {
        SenderGetter.initClass(this, { senderId, sender, inputSender });
    }

    static initClass(
        c: any,
        { senderId, sender, inputSender }: SenderGetterConstructorInterface
    ) {
        c._senderId = senderId;
        c._sender = sender;
        c._inputSender = inputSender;
        c._client = undefined;
    }

    get sender() {
        return this._sender;
    }

    async getSender() {
        if (
            this._client &&
            (!this._sender ||
                (this._sender instanceof Api.Channel && this._sender.min)) &&
            (await this.getInputSender())
        ) {
            try {
                this._sender = await this._client.getEntity(this._inputSender);
            } catch (e) {
                await this._refetchSender();
            }
        }
        if (!this._sender) {
            throw new Error("Could not find sender");
        }
        return this._sender;
    }

    get inputSender() {
        if (!this._inputSender && this._senderId && this._client) {
            try {
                this._inputSender = this._client._entityCache.get(
                    this._senderId
                );
            } catch (e) {}
        }
        return this._inputSender;
    }

    async getInputSender() {
        if (!this.inputSender && this._senderId && this._client) {
            await this._refetchSender();
        }
        return this._inputSender;
    }

    get senderId() {
        return this._senderId;
    }

    async _refetchSender() {}
}
