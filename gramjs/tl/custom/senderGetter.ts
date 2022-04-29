import type { Entity } from "../../define";
import type { TelegramClient } from "../..";
import { Api } from "../api";
import { betterConsoleLog } from "../../Helpers";
import { ChatGetter } from "./chatGetter";
import bigInt from "big-integer";
import { inspect } from "../../inspect";

interface SenderGetterConstructorInterface {
    senderId?: bigInt.BigInteger;
    sender?: Entity;
    inputSender?: Api.TypeInputPeer;
}

export class SenderGetter extends ChatGetter {
    _senderId?: bigInt.BigInteger;
    _sender?: Entity;
    _inputSender?: Api.TypeInputPeer;
    public _client?: TelegramClient;
    [inspect.custom]() {
        return betterConsoleLog(this);
    }

    static initSenderClass(
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
                this._sender = await this._client.getEntity(this._inputSender!);
            } catch (e) {
                await this._refetchSender();
            }
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
