/// <reference types="node" />
import type { ButtonLike, EntityLike } from "../../define";
import { Api } from "../api";
import { inspect } from "../../inspect";
export declare class Button {
    button: ButtonLike;
    resize: boolean | undefined;
    selective: boolean | undefined;
    singleUse: boolean | undefined;
    [inspect.custom](): {
        [key: string]: any;
    };
    constructor(button: Api.TypeKeyboardButton, resize?: boolean, singleUse?: boolean, selective?: boolean);
    static _isInline(button: ButtonLike): boolean;
    static inline(text: string, data?: Buffer): Api.KeyboardButtonCallback;
    static switchInline(text: string, query?: string, samePeer?: boolean): Api.KeyboardButtonSwitchInline;
    static url(text: string, url?: string): Api.KeyboardButtonUrl;
    static auth(text: string, url?: string, bot?: EntityLike, writeAccess?: boolean, fwdText?: string): Api.InputKeyboardButtonUrlAuth;
    static text(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean): Button;
    static requestLocation(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean): Button;
    static requestPhone(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean): Button;
    static requestPoll(text: string, resize?: boolean, singleUse?: boolean, selective?: boolean): Button;
    static clear(): Api.ReplyKeyboardHide;
    static forceReply(): Api.ReplyKeyboardForceReply;
}
