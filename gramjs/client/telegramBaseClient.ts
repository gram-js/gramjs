import { Connection, TelegramClient, version } from "../";
import { sleep } from "../Helpers";
import {
    ConnectionTCPFull,
    ConnectionTCPObfuscated,
} from "../network/connection";
import { Session, StoreSession } from "../sessions";
import { Logger, PromisedNetSockets, PromisedWebSockets } from "../extensions";
import { Api } from "../tl";

import os from "./os";
import type { AuthKey } from "../crypto/AuthKey";
import { EntityCache } from "../entityCache";
import type { ParseInterface } from "./messageParse";
import type { EventBuilder } from "../events/common";
import { MarkdownParser } from "../extensions/markdown";
import { MTProtoSender } from "../network";
import { LAYER } from "../tl/AllTLObjects";
import {
    ConnectionTCPMTProxyAbridged,
    ProxyInterface,
} from "../network/connection/TCPMTProxy";
import { Semaphore } from "async-mutex";
import { LogLevel } from "../extensions/Logger";
import { isBrowser, isNode } from "../platform";
import Deferred from "../extensions/Deferred";
import Timeout = NodeJS.Timeout;

const EXPORTED_SENDER_RECONNECT_TIMEOUT = 1000; // 1 sec
const EXPORTED_SENDER_RELEASE_TIMEOUT = 30000; // 30 sec

const DEFAULT_DC_ID = 4;
const DEFAULT_IPV4_IP = isNode ? "149.154.167.91" : "vesta.web.telegram.org";
const DEFAULT_IPV6_IP = "2001:067c:04e8:f004:0000:0000:0000:000a";

/**
 * Interface for creating a new client.
 * All of these have a default value and you should only change those if you know what you are doing.
 */
export interface TelegramClientParams {
    /** The connection instance to be used when creating a new connection to the servers. It must be a type.<br/>
     * Defaults to {@link ConnectionTCPFull} on Node and {@link ConnectionTCPObfuscated} on browsers.
     */
    connection?: typeof Connection;
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
     * Experimental proxy to be used for the connection. (only supports MTProxies)
     */
    proxy?: ProxyInterface;
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
     * Instance of Logger to use. <br />
     * If a `Logger` is given, it'll be used directly. If nothing is given, the default logger will be used. <br />
     * To create your own Logger make sure you extends GramJS logger {@link Logger} and override `log` method.
     */
    baseLogger?: Logger;
    /**
     * Whether to try to connect over Wss (or 443 port) or not.
     */
    useWSS?: boolean;
    /**
     * Limits how many downloads happen at the same time.
     */
    maxConcurrentDownloads?: number;
    /**
     * Whether to check for tampering in messages or not.
     */
    securityChecks?: boolean;
    /**
     * Only for web DCs. Whether to use test servers or not.
     */
    testServers?: boolean;
    /**
     * What type of network connection to use (Normal Socket (for node) or Websockets (for browsers usually) )
     */
    networkSocket?: typeof PromisedNetSockets | typeof PromisedWebSockets;
}

const clientParamsDefault = {
    connection: isNode ? ConnectionTCPFull : ConnectionTCPObfuscated,
    networkSocket: isNode ? PromisedNetSockets : PromisedWebSockets,
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
    _securityChecks: true,
    useWSS: isBrowser,
    testServers: false,
};

export abstract class TelegramBaseClient {
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
    public _connection: typeof Connection;
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
    public _errorHandler?: (error: Error) => Promise<void>;
    /** @hidden */
    public _eventBuilders: [EventBuilder, CallableFunction][];
    /** @hidden */
    public _entityCache: EntityCache;
    /** @hidden */
    public _lastRequest?: number;
    /** @hidden */
    public _parseMode?: ParseInterface;
    /** @hidden */
    public _ALBUMS = new Map<
        string,
        [ReturnType<typeof setTimeout>, Api.TypeUpdate[]]
    >();
    /** @hidden */
    public _exportedSenderPromises = new Map<number, Promise<MTProtoSender>>();
    /** @hidden */
    private _exportedSenderReleaseTimeouts = new Map<
        number,
        ReturnType<typeof setTimeout>
    >();
    /** @hidden */
    protected _loopStarted: boolean;
    /** @hidden */
    _reconnecting: boolean;
    /** @hidden */
    _destroyed: boolean;
    /** @hidden */
    _isSwitchingDc: boolean;
    /** @hidden */
    protected _proxy?: ProxyInterface;
    /** @hidden */
    _semaphore: Semaphore;
    /** @hidden */
    _securityChecks: boolean;
    /** @hidden */
    public testServers: boolean;
    /** @hidden */
    public networkSocket: typeof PromisedNetSockets | typeof PromisedWebSockets;
    _connectedDeferred: Deferred<void>;

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
        if (clientParams.baseLogger) {
            this._log = clientParams.baseLogger;
        } else {
            this._log = new Logger();
        }
        this._log.info("Running gramJS version " + version);
        if (session && typeof session == "string") {
            session = new StoreSession(session);
        }
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
        this._proxy = clientParams.proxy;
        this._semaphore = new Semaphore(
            clientParams.maxConcurrentDownloads || 1
        );
        this.testServers = clientParams.testServers || false;
        this.networkSocket = clientParams.networkSocket || PromisedNetSockets;
        if (!(clientParams.connection instanceof Function)) {
            throw new Error("Connection should be a class not an instance");
        }
        this._connection = clientParams.connection;
        let initProxy;
        if (this._proxy && "MTProxy" in this._proxy) {
            this._connection = ConnectionTCPMTProxyAbridged;
            initProxy = new Api.InputClientProxy({
                address: this._proxy.ip,
                port: this._proxy.port,
            });
        }
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
            proxy: initProxy,
        });
        this._eventBuilders = [];

        this._floodWaitedRequests = {};
        this._borrowedSenderPromises = {};
        this._bot = undefined;
        this._selfInputPeer = undefined;
        this.useWSS = clientParams.useWSS!;
        this._securityChecks = !!clientParams.securityChecks;
        if (this.useWSS && this._proxy) {
            throw new Error(
                "Cannot use SSL with proxies. You need to disable the useWSS client param in TelegramClient"
            );
        }
        this._entityCache = new EntityCache();
        // These will be set later
        this._config = undefined;
        this._loopStarted = false;
        this._reconnecting = false;
        this._destroyed = false;
        this._isSwitchingDc = false;
        this._connectedDeferred = new Deferred();

        // parse mode
        this._parseMode = MarkdownParser;
    }

    get floodSleepThreshold() {
        return this._floodSleepThreshold;
    }

    set floodSleepThreshold(value: number) {
        this._floodSleepThreshold = Math.min(value || 0, 24 * 60 * 60);
    }

    set maxConcurrentDownloads(value: number) {
        // @ts-ignore
        this._semaphore._value = value;
    }

    // region connecting
    async _initSession() {
        await this.session.load();
        if (!this.session.serverAddress) {
            this.session.setDC(
                DEFAULT_DC_ID,
                this._useIPV6 ? DEFAULT_IPV6_IP : DEFAULT_IPV4_IP,
                this.useWSS ? 443 : 80
            );
        } else {
            this._useIPV6 = this.session.serverAddress.includes(":");
        }
    }

    get connected() {
        return this._sender && this._sender.isConnected();
    }

    async disconnect() {
        await this._disconnect();
        await Promise.all(
            Object.values(this._exportedSenderPromises)
                .map((promises) => {
                    return Object.values(promises).map((promise: any) => {
                        return (
                            promise &&
                            promise.then((sender: MTProtoSender) => {
                                if (sender) {
                                    return sender.disconnect();
                                }
                                return undefined;
                            })
                        );
                    });
                })
                .flat()
        );

        Object.values(this._exportedSenderReleaseTimeouts).forEach(
            (timeouts) => {
                Object.values(timeouts).forEach((releaseTimeout: any) => {
                    clearTimeout(releaseTimeout);
                });
            }
        );
        this._exportedSenderPromises.clear();
    }

    get disconnected() {
        return !this._sender || this._sender._disconnected;
    }

    async _disconnect() {
        await this._sender?.disconnect();
    }

    /**
     * Disconnects all senders and removes all handlers
     * Disconnect is safer as it will not remove your event handlers
     */
    async destroy() {
        this._destroyed = true;
        await Promise.all([
            this.disconnect(),
            ...Object.values(this._borrowedSenderPromises).map(
                (promise: any) => {
                    return promise.then((sender: any) => sender.disconnect());
                }
            ),
        ]);

        this._eventBuilders = [];
    }

    /** @hidden */
    async _authKeyCallback(authKey: AuthKey, dcId: number) {
        this.session.setAuthKey(authKey, dcId);
        await this.session.save();
    }

    /** @hidden */
    async _cleanupExportedSender(dcId: number) {
        if (this.session.dcId !== dcId) {
            this.session.setAuthKey(undefined, dcId);
        }
        let sender = await this._exportedSenderPromises.get(dcId);
        this._exportedSenderPromises.delete(dcId);
        await sender?.disconnect();
    }

    /** @hidden */
    async _connectSender(sender: MTProtoSender, dcId: number) {
        // if we don't already have an auth key we want to use normal DCs not -1
        const dc = await this.getDC(dcId, !!sender.authKey.getKey());

        while (true) {
            try {
                await sender.connect(
                    new this._connection({
                        ip: dc.ipAddress,
                        port: dc.port,
                        dcId: dcId,
                        loggers: this._log,
                        proxy: this._proxy,
                        testServers: this.testServers,
                        socket: this.networkSocket,
                    }),
                    false
                );

                if (this.session.dcId !== dcId && !sender._authenticated) {
                    this._log.info(
                        `Exporting authorization for data center ${dc.ipAddress} with layer ${LAYER}`
                    );
                    const auth = await this.invoke(
                        new Api.auth.ExportAuthorization({ dcId: dcId })
                    );
                    this._initRequest.query = new Api.auth.ImportAuthorization({
                        id: auth.id,
                        bytes: auth.bytes,
                    });

                    const req = new Api.InvokeWithLayer({
                        layer: LAYER,
                        query: this._initRequest,
                    });
                    await sender.send(req);
                    sender._authenticated = true;
                }
                sender.dcId = dcId;
                sender.userDisconnected = false;

                return sender;
            } catch (err: any) {
                if (err.errorMessage === "DC_ID_INVALID") {
                    sender._authenticated = true;
                    sender.userDisconnected = false;
                    return sender;
                }
                if (this._errorHandler) {
                    await this._errorHandler(err as Error);
                } else if (this._log.canSend(LogLevel.ERROR)) {
                    console.error(err);
                }

                await sleep(1000);
                await sender.disconnect();
            }
        }
    }

    /** @hidden */
    async _borrowExportedSender(
        dcId: number,
        shouldReconnect?: boolean,
        existingSender?: MTProtoSender
    ): Promise<MTProtoSender> {
        if (!this._exportedSenderPromises.get(dcId) || shouldReconnect) {
            this._exportedSenderPromises.set(
                dcId,
                this._connectSender(
                    existingSender || this._createExportedSender(dcId),
                    dcId
                )
            );
        }

        let sender: MTProtoSender;
        try {
            sender = await this._exportedSenderPromises.get(dcId)!;

            if (!sender.isConnected()) {
                if (sender.isConnecting) {
                    await sleep(EXPORTED_SENDER_RECONNECT_TIMEOUT);
                    return this._borrowExportedSender(dcId, false, sender);
                } else {
                    return this._borrowExportedSender(dcId, true, sender);
                }
            }
        } catch (err) {
            if (this._errorHandler) {
                await this._errorHandler(err as Error);
            }
            if (this._log.canSend(LogLevel.ERROR)) {
                console.error(err);
            }
            return this._borrowExportedSender(dcId, true);
        }

        if (this._exportedSenderReleaseTimeouts.get(dcId)) {
            clearTimeout(this._exportedSenderReleaseTimeouts.get(dcId)!);
            this._exportedSenderReleaseTimeouts.delete(dcId);
        }

        this._exportedSenderReleaseTimeouts.set(
            dcId,
            setTimeout(() => {
                this._exportedSenderReleaseTimeouts.delete(dcId);
                if (sender._pendingState.values().length) {
                    console.log(
                        "sender already has some hanging states. reconnecting"
                    );
                    sender._reconnect();
                    this._borrowExportedSender(dcId, false, sender);
                } else {
                    sender.disconnect();
                }
            }, EXPORTED_SENDER_RELEASE_TIMEOUT)
        );

        return sender;
    }

    /** @hidden */
    _createExportedSender(dcId: number) {
        return new MTProtoSender(this.session.getAuthKey(dcId), {
            logger: this._log,
            dcId,
            retries: this._connectionRetries,
            delay: this._retryDelay,
            autoReconnect: this._autoReconnect,
            connectTimeout: this._timeout,
            authKeyCallback: this._authKeyCallback.bind(this),
            isMainSender: dcId === this.session.dcId,
            onConnectionBreak: this._cleanupExportedSender.bind(this),
            client: this as unknown as TelegramClient,
            securityChecks: this._securityChecks,
            _exportedSenderPromises: this._exportedSenderPromises,
        });
    }

    /** @hidden */
    getSender(dcId: number): Promise<MTProtoSender> {
        return dcId
            ? this._borrowExportedSender(dcId)
            : Promise.resolve(this._sender!);
    }

    // endregion
    async getDC(
        dcId: number,
        download: boolean
    ): Promise<{ id: number; ipAddress: string; port: number }> {
        throw new Error("Cannot be called from here!");
    }

    invoke<R extends Api.AnyRequest>(request: R): Promise<R["__response"]> {
        throw new Error("Cannot be called from here!");
    }

    setLogLevel(level: LogLevel) {
        this._log.setLevel(level);
    }

    get logger() {
        return this._log;
    }

    /**
     * Custom error handler for the client
     * @example
     * ```ts
     * client.onError = async (error)=>{
     *         console.log("error is",error)
     *     }
     * ```
     */
    set onError(handler: (error: Error) => Promise<void>) {
        this._errorHandler = async (error: Error) => {
            try {
                await handler(error);
            } catch (e: any) {
                if (this._log.canSend(LogLevel.ERROR)) {
                    e.message = `Error ${e.message} thrown while handling top-level error: ${error.message}`;
                    console.error(e);
                }
            }
        };
    }
}
