"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const api_1 = require("../api");
const __1 = require("../../");
const Helpers_1 = require("../../Helpers");
const inspect_1 = require("../../inspect");
class Button {
    constructor(button, resize, singleUse, selective) {
        this.button = button;
        this.resize = resize;
        this.singleUse = singleUse;
        this.selective = selective;
    }
    [inspect_1.inspect.custom]() {
        return (0, Helpers_1.betterConsoleLog)(this);
    }
    static _isInline(button) {
        return (button instanceof api_1.Api.KeyboardButtonCallback ||
            button instanceof api_1.Api.KeyboardButtonSwitchInline ||
            button instanceof api_1.Api.KeyboardButtonUrl ||
            button instanceof api_1.Api.KeyboardButtonUrlAuth ||
            button instanceof api_1.Api.InputKeyboardButtonUrlAuth);
    }
    static inline(text, data) {
        if (!data) {
            data = Buffer.from(text, "utf-8");
        }
        if (data.length > 64) {
            throw new Error("Too many bytes for the data");
        }
        return new api_1.Api.KeyboardButtonCallback({
            text: text,
            data: data,
        });
    }
    static switchInline(text, query = "", samePeer = false) {
        return new api_1.Api.KeyboardButtonSwitchInline({
            text,
            query,
            samePeer,
        });
    }
    static url(text, url) {
        return new api_1.Api.KeyboardButtonUrl({
            text: text,
            url: url || text,
        });
    }
    static auth(text, url, bot, writeAccess, fwdText) {
        return new api_1.Api.InputKeyboardButtonUrlAuth({
            text,
            url: url || text,
            bot: __1.utils.getInputUser(bot || new api_1.Api.InputUserSelf()),
            requestWriteAccess: writeAccess,
            fwdText: fwdText,
        });
    }
    static text(text, resize, singleUse, selective) {
        return new this(new api_1.Api.KeyboardButton({ text }), resize, singleUse, selective);
    }
    static requestLocation(text, resize, singleUse, selective) {
        return new this(new api_1.Api.KeyboardButtonRequestGeoLocation({ text }), resize, singleUse, selective);
    }
    static requestPhone(text, resize, singleUse, selective) {
        return new this(new api_1.Api.KeyboardButtonRequestPhone({ text }), resize, singleUse, selective);
    }
    static requestPoll(text, resize, singleUse, selective) {
        return new this(new api_1.Api.KeyboardButtonRequestPoll({ text }), resize, singleUse, selective);
    }
    static clear() {
        return new api_1.Api.ReplyKeyboardHide({});
    }
    static forceReply() {
        return new api_1.Api.ReplyKeyboardForceReply({});
    }
}
exports.Button = Button;
