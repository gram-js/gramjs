import {ButtonLike, EntityLike} from "../../define";
import {Api} from "../api";
import {utils} from "../../index";

export class Button  {
    public button: ButtonLike;
    public resize: boolean | undefined;
    public selective: boolean | undefined;
    public singleUse: boolean | undefined;

    constructor(button: ButtonLike, resize?: boolean, singleUse?: boolean, selective?: boolean) {
        this.button = button;
        this.resize = resize;
        this.singleUse = singleUse;
        this.selective = selective;
    }

    static _isInline(button: ButtonLike) {
        return button instanceof Api.KeyboardButtonCallback ||
            button instanceof Api.KeyboardButtonSwitchInline ||
            button instanceof Api.KeyboardButtonUrl || button instanceof Api.KeyboardButtonUrlAuth
    }

    static inline(text: string, data?: Buffer) {
        if (!data) {
            data = Buffer.from(text, "utf-8");
        }
        if (data.length > 64) {
            throw new Error("Too many bytes for the data");
        }
        return new Api.KeyboardButtonCallback({
            text: text,
            data: data
        })
    }

    static switchInline(text: string, query = '', samePeer = false) {
        return new Api.KeyboardButtonSwitchInline({
            text, query, samePeer
        });
    }

    static url(text: string, url?: string) {
        return new Api.KeyboardButtonUrl({
            text: text,
            url: url || text,
        })
    }

    static auth(text: string, url?: string, bot?: EntityLike, writeAccess?: boolean, fwdText?: string) {
        return new Api.InputKeyboardButtonUrlAuth({
            text,
            url: url || text,
            bot: utils.getInputPeer(bot || new Api.InputUserSelf()),
            requestWriteAccess: writeAccess,
            fwdText: fwdText
        })
    }

    static text(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean) {
        return new this(new Api.KeyboardButton({text}), resize, singleUse, selective);
    }

    static requestLocation(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean) {
        return new this(new Api.KeyboardButtonRequestGeoLocation({text}), resize, singleUse, selective);
    }

    static requestPhone(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean) {
        return new this(new Api.KeyboardButtonRequestPhone({text}), resize, singleUse, selective);
    }

    static requestPoll(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean) {
        return new this(new Api.KeyboardButtonRequestPoll({text}), resize, singleUse, selective);
    }

    static clear() {
        return new Api.ReplyKeyboardHide();
    }

    static forceReply() {
        return new Api.ReplyKeyboardForceReply();
    }
}
