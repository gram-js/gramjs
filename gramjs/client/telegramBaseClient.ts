import { version } from "../";
import { IS_NODE } from "../Helpers";
import {
    ConnectionTCPFull,
    ConnectionTCPObfuscated,
} from "../network/connection";
import { Session } from "../sessions";
import { Logger } from "../extensions";
import { Api } from "../tl";

import os from "os";
import type { AuthKey } from "../crypto/AuthKey";
import { EntityCache } from "../entityCache";
import type { ParseInterface } from "./messageParse";
import type { EventBuilder } from "../events/common";
import { MarkdownParser } from "../extensions/markdown";
import { MTProtoSender } from "../network";

const DEFAULT_DC_ID = 1;
const DEFAULT_IPV4_IP = IS_NODE ? "149.154.167.51" : "pluto.web.telegram.org";
const DEFAULT_IPV6_IP = "2001:67c:4e8:f002::a";

/**
 * Interface for creating a new client.
 * All of these have a default value and you should only change those if you know what you are doing.
 */
export interface TelegramClientParams {
    /** The connection instance to be used when creating a new connection to the servers. It must be a type.<br/>
     * Defaults to {@link ConnectionTCPFull} on Node and {@link ConnectionTCPObfuscated} on browsers.
     */
    connection?: any;
    /**
     * Whether to connect to the servers through IPv6 or not. By default this is false.
     */
    useIPV6?: boolean;
    /**
     * The timeout in seconds to be used when connecting. This does nothing for now.
     */
    timeout?: number;
    /**
     * How many times a request should be retried.<br/>
     * Request are retried when Telegram is having internal issues (due to INTERNAL error or RPC_CALL_FAIL error),<br/>
     * when there is a errors.FloodWaitError less than floodSleepThreshold, or when there's a migrate error.<br/>
     * defaults to 5.
     */
    requestRetries?: number;
    /**
     * How many times the reconnection should retry, either on the initial connection or when Telegram disconnects us.<br/>
     * May be set to a negative or undefined value for infinite retries, but this is not recommended, since the program can get stuck in an infinite loop.<br/>
     * defaults to 5
     */
    connectionRetries?: number;
    /**
     * How many times we should retry borrowing a sender from another DC when it fails. defaults to 5
     */
    downloadRetries?: number;
    /** The delay in milliseconds to sleep between automatic reconnections. defaults to 1000*/
    retryDelay?: number;
    /**Whether reconnection should be retried connection_retries times automatically if Telegram disconnects us or not. defaults to true */
    autoReconnect?: boolean;
    /** does nothing for now */
    sequentialUpdates?: boolean;
    /** The threshold below which the library should automatically sleep on flood wait and slow mode wait errors (inclusive).<br/>
     *  For instance, if a FloodWaitError for 17s occurs and floodSleepThreshold is 20s, the library will sleep automatically.<br/>
     *  If the error was for 21s, it would raise FloodWaitError instead. defaults to 60 sec.*/
    floodSleepThreshold?: number;
    /**
     * Device model to be sent when creating the initial connection. Defaults to os.type().toString().
     */
    deviceModel?: string;
    /**
     * System version to be sent when creating the initial connection. defaults to os.release().toString() -.
     */
    systemVersion?: string;
    /**
     * App version to be sent when creating the initial connection. Defaults to 1.0.
     */
    appVersion?: string;
    /**
     * Language code to be sent when creating the initial connection. Defaults to 'en'.
     */
    langCode?: string;
    /**
     * System lang code to be sent when creating the initial connection. Defaults to 'en'.
     */
    systemLangCode?: string;
    /**
     * Does nothing for now. don't change.
     */
    baseLogger?: string | any;
    /**
     * Whether to try to connect over Wss (or 443 port) or not.
     */
    useWSS?: boolean;
}

const clientParamsDefault = {
    connection: IS_NODE ? ConnectionTCPFull : ConnectionTCPObfuscated,
    useIPV6: false,
    timeout: 10,
    requestRetries: 5,
    connectionRetries: Infinity,
    retryDelay: 1000,
    downloadRetries: 5,
    autoReconnect: true,
    sequentialUpdates: false,
    floodSleepThreshold: 60,
    deviceModel: "",
    systemVersion: "",
    appVersion: "",
    langCode: "en",
    systemLangCode: "en",
    baseLogger: "gramjs",
    useWSS:
        typeof window !== "undefined"
            ? window.location.protocol == "https:"
            : false,
};

export class TelegramBaseClient {
    /** The current gramJS version. */
    __version__ = version;
    /** @hidden */
    _config?: Api.Config;
    /** @hidden */
    public _log: Logger;

    /** @hidden */
    public _floodSleepThreshold: number;
    public session: Session;
    public apiHash: string;
    public apiId: number;

    /** @hidden */
    public _requestRetries: number;
    /** @hidden */
    public _downloadRetries: number;
    /** @hidden */
    public _connectionRetries: number;
    /** @hidden */
    public _retryDelay: number;
    /** @hidden */
    public _timeout: number;
    /** @hidden */
    public _autoReconnect: boolean;
    /** @hidden */
    public _connection: any;
    /** @hidden */
    public _initRequest: Api.InitConnection;
    /** @hidden */
    public _sender?: MTProtoSender;
    /** @hidden */
    public _floodWaitedRequests: any;
    /** @hidden */
    public _borrowedSenderPromises: any;
    /** @hidden */
    public _bot?: boolean;
    /** @hidden */
    public _useIPV6: boolean;
    /** @hidden */
    public _selfInputPeer?: Api.InputPeerUser;
    /** @hidden */
    public useWSS: boolean;

    /** @hidden */
    public _eventBuilders: [EventBuilder, CallableFunction][];
    /** @hidden */
    public _entityCache: EntityCache;
    /** @hidden */
    public _lastRequest?: number;
    /** @hidden */
    public _parseMode?: ParseInterface;

    constructor(
        session: string | Session,
        apiId: number,
        apiHash: string,
        clientParams: TelegramClientParams
    ) {
        clientParams = { ...clientParamsDefault, ...clientParams };
        if (!apiId || !apiHash) {
            throw new Error("Your API ID or Hash cannot be empty or undefined");
        }
        if (typeof clientParams.baseLogger == "string") {
            this._log = new Logger();
        } else {
            this._log = clientParams.baseLogger;
        }
        this._log.debug("Running gramJS version " + version);
        if (!(session instanceof Session)) {
            throw new Error(
                "Only StringSession and StoreSessions are supported currently :( "
            );
        }
        this._floodSleepThreshold = clientParams.floodSleepThreshold!;
        this.session = session;
        this.apiId = apiId;
        this.apiHash = apiHash;
        this._useIPV6 = clientParams.useIPV6!;
        this._requestRetries = clientParams.requestRetries!;
        this._downloadRetries = clientParams.downloadRetries!;
        this._connectionRetries = clientParams.connectionRetries!;
        this._retryDelay = clientParams.retryDelay || 0;
        this._timeout = clientParams.timeout!;
        this._autoReconnect = clientParams.autoReconnect!;
        if (!(clientParams.connection instanceof Function)) {
            throw new Error("Connection should be a class not an instance");
        }
        this._connection = clientParams.connection;
        this._initRequest = new Api.InitConnection({
            apiId: this.apiId,
            deviceModel:
                clientParams.deviceModel || os.type().toString() || "Unknown",
            systemVersion:
                clientParams.systemVersion || os.release().toString() || "1.0",
            appVersion: clientParams.appVersion || "1.0",
            langCode: clientParams.langCode,
            langPack: "", // this should be left empty.
            systemLangCode: clientParams.systemLangCode,
            proxy: undefined, // no proxies yet.
        });
        this._eventBuilders = [];

        this._floodWaitedRequests = {};
        this._borrowedSenderPromises = {};
        this._bot = undefined;
        this._selfInputPeer = undefined;
        this.useWSS = clientParams.useWSS!;
        this._entityCache = new EntityCache();

        // parse mode
        this._parseMode = MarkdownParser;
    }

    get floodSleepThreshold() {
        return this._floodSleepThreshold;
    }

    set floodSleepThreshold(value: number) {
        this._floodSleepThreshold = Math.min(value || 0, 24 * 60 * 60);
    }

    // region connecting
    async _initSession() {
        await this.session.load();

        if (
            !this.session.serverAddress ||
            this.session.serverAddress.includes(":") !== this._useIPV6
        ) {
            this.session.setDC(
                DEFAULT_DC_ID,
                this._useIPV6 ? DEFAULT_IPV6_IP : DEFAULT_IPV4_IP,
                this.useWSS ? 443 : 80
            );
        }
    }

    get connected() {
        return this._sender && this._sender.isConnected();
    }

    async disconnect() {
        if (this._sender) {
            await this._sender.disconnect();
        }
    }

    get disconnected() {
        return !this._sender || this._sender._disconnected;
    }

    async destroy() {
        await Promise.all([
            this.disconnect(),
            this.session.delete(),
            ...Object.values(this._borrowedSenderPromises).map(
                (promise: any) => {
                    return promise.then((sender: any) => sender.disconnect());
                }
            ),
        ]);

        this._eventBuilders = [];
    }

    async _authKeyCallback(authKey: AuthKey, dcId: number) {
        this.session.setAuthKey(authKey, dcId);
        await this.session.save();
    }

    // endregion
}
