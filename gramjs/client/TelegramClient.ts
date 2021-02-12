import {DownloadMethods} from "./downloads";
import {DialogMethods} from "./dialogs";
import {TelegramBaseClient, TelegramClientParams} from "./telegramBaseClient";
import {ButtonMethods} from "./buttons";
import {UpdateMethods} from "./updates";
import {MessageMethods} from "./messages";
import {MessageParseMethods} from "./messageParse";
import {AuthMethods} from "./auth";
import {UserMethods} from "./users";
import {ChatMethods} from "./chats";
import {Mixin} from "ts-mixer";
import {Session} from "../sessions/Abstract";
import {IS_NODE} from "../Helpers";
import {ConnectionTCPFull, ConnectionTCPObfuscated} from "../network/connection";

// TODO add uploads

export class TelegramClient extends Mixin(AuthMethods, DownloadMethods, DialogMethods, ChatMethods,
    MessageMethods, ButtonMethods, UpdateMethods,
    MessageParseMethods, UserMethods, TelegramBaseClient) {
    constructor(session: string | Session, apiId: number, apiHash: string, {
        connection = IS_NODE ? ConnectionTCPFull : ConnectionTCPObfuscated,
        useIPV6 = false,
        timeout = 10,
        requestRetries = 5,
        connectionRetries = 5,
        retryDelay = 1000,
        autoReconnect = true,
        sequentialUpdates = false,
        floodSleepThreshold = 60,
        deviceModel = '',
        systemVersion = '',
        appVersion = '',
        langCode = 'en',
        systemLangCode = 'en',
        baseLogger = 'gramjs',
        useWSS = false,
    }: TelegramClientParams) {
        super(session, apiId, apiHash, {
            connection,
            useIPV6,
            timeout,
            requestRetries,
            connectionRetries,
            retryDelay,
            autoReconnect,
            sequentialUpdates ,
            floodSleepThreshold,
            deviceModel,
            systemVersion,
            appVersion,
            langCode,
            systemLangCode,
            baseLogger,
            useWSS,
        });
    }


}
