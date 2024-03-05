/// <reference types="node" />
import { Api } from "../tl";
import type { TelegramClient } from "./TelegramClient";
/**
 * For when you want to login as a {@link Api.User}<br/>
 * this should handle all needed steps for authorization as a user.<br/>
 * to stop the operation at any point just raise and error with the message `AUTH_USER_CANCEL`.
 */
export interface UserAuthParams {
    /** Either a string or a callback that returns a string for the phone to use to login. */
    phoneNumber: string | (() => Promise<string>);
    /** callback that should return the login code that telegram sent.<br/>
     *  has optional bool `isCodeViaApp` param for whether the code was sent through the app (true) or an SMS (false). */
    phoneCode: (isCodeViaApp?: boolean) => Promise<string>;
    /** optional string or callback that should return the 2FA password if present.<br/>
     *  the password hint will be sent in the hint param */
    password?: (hint?: string) => Promise<string>;
    /** in case of a new account creation this callback should return a first name and last name `[first,last]`. */
    firstAndLastNames?: () => Promise<[string, string?]>;
    /** a qrCode token for login through qrCode.<br/>
     *  this would need a QR code that you should scan with another app to login with. */
    qrCode?: (qrCode: {
        token: Buffer;
        expires: number;
    }) => Promise<void>;
    /** when an error happens during auth this function will be called with the error.<br/>
     *  if this returns true the auth operation will stop. */
    onError: (err: Error) => Promise<boolean> | void;
    /** whether to send the code through SMS or not. */
    forceSMS?: boolean;
}
export interface UserPasswordAuthParams {
    /** optional string or callback that should return the 2FA password if present.<br/>
     *  the password hint will be sent in the hint param */
    password?: (hint?: string) => Promise<string>;
    /** when an error happens during auth this function will be called with the error.<br/>
     *  if this returns true the auth operation will stop. */
    onError: (err: Error) => Promise<boolean> | void;
}
export interface QrCodeAuthParams extends UserPasswordAuthParams {
    /** a qrCode token for login through qrCode.<br/>
     *  this would need a QR code that you should scan with another app to login with. */
    qrCode?: (qrCode: {
        token: Buffer;
        expires: number;
    }) => Promise<void>;
    /** when an error happens during auth this function will be called with the error.<br/>
     *  if this returns true the auth operation will stop. */
    onError: (err: Error) => Promise<boolean> | void;
}
interface ReturnString {
    (): string;
}
/**
 * For when you want as a normal bot created by https://t.me/Botfather.<br/>
 * Logging in as bot is simple and requires no callbacks
 */
export interface BotAuthParams {
    /**
     * the bot token to use.
     */
    botAuthToken: string | ReturnString;
}
/**
 * Credential needed for the authentication. you can get theses from https://my.telegram.org/auth<br/>
 * Note: This is required for both logging in as a bot and a user.<br/>
 */
export interface ApiCredentials {
    /** The app api id. */
    apiId: number;
    /** the app api hash */
    apiHash: string;
}
/** @hidden */
export declare function start(client: TelegramClient, authParams: UserAuthParams | BotAuthParams): Promise<void>;
/** @hidden */
export declare function checkAuthorization(client: TelegramClient): Promise<boolean>;
/** @hidden */
export declare function signInUser(client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams): Promise<Api.TypeUser>;
/** @hidden */
export declare function signInUserWithQrCode(client: TelegramClient, apiCredentials: ApiCredentials, authParams: QrCodeAuthParams): Promise<Api.TypeUser>;
/** @hidden */
export declare function sendCode(client: TelegramClient, apiCredentials: ApiCredentials, phoneNumber: string, forceSMS?: boolean): Promise<{
    phoneCodeHash: string;
    isCodeViaApp: boolean;
}>;
/** @hidden */
export declare function signInWithPassword(client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserPasswordAuthParams): Promise<Api.TypeUser>;
/** @hidden */
export declare function signInBot(client: TelegramClient, apiCredentials: ApiCredentials, authParams: BotAuthParams): Promise<Api.TypeUser>;
/** @hidden */
export declare function _authFlow(client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams | BotAuthParams): Promise<void>;
export {};
