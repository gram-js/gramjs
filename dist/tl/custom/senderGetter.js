"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SenderGetter = void 0;
const api_1 = require("../api");
const Helpers_1 = require("../../Helpers");
const chatGetter_1 = require("./chatGetter");
const inspect_1 = require("../../inspect");
class SenderGetter extends chatGetter_1.ChatGetter {
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    static initSenderClass(c, { senderId, sender, inputSender }) {
        c._senderId = senderId;
        c._sender = sender;
        c._inputSender = inputSender;
        c._client = undefined;
    }
    get sender() {
        return this._sender;
    }
    async getSender() {
        if (this._client &&
            (!this._sender ||
                (this._sender instanceof api_1.Api.Channel && this._sender.min)) &&
            (await this.getInputSender())) {
            try {
                this._sender = await this._client.getEntity(this._inputSender);
            }
            catch (e) {
                await this._refetchSender();
            }
        }
        return this._sender;
    }
    get inputSender() {
        if (!this._inputSender && this._senderId && this._client) {
            try {
                this._inputSender = this._client._entityCache.get(this._senderId);
            }
            catch (e) { }
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
    async _refetchSender() { }
}
exports.SenderGetter = SenderGetter;
