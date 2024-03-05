/// <reference types="node" />
import { Connection } from "../";
import { Session } from "../sessions";
import { Logger, PromisedNetSockets, PromisedWebSockets } from "../extensions";
import { Api } from "../tl";
import type { AuthKey } from "../crypto/AuthKey";
import { EntityCache } from "../entityCache";
import type { ParseInterface } from "./messageParse";
import type { EventBuilder } from "../events/common";
import { MTProtoSender } from "../network";
import { ProxyInterface } from "../network/connection/TCPMTProxy";
import { Semaphore } from "async-mutex";
import { LogLevel } from "../extensions/Logger";
import Deferred from "../extensions/Deferred";
import Timeout = NodeJS.Timeout;
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
     * Language pack. Defaults to ''.
     */
    langPack?: string;
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
export declare abstract class TelegramBaseClient {
    /** The current gramJS version. */
    __version__: string;
    /** @hidden */
    _config?: Api.Config;
    /** @hidden */
    _log: Logger;
    /** @hidden */
    _floodSleepThreshold: number;
    session: Session;
    apiHash: string;
    apiId: number;
    /** @hidden */
    _requestRetries: number;
    /** @hidden */
    _downloadRetries: number;
    /** @hidden */
    _connectionRetries: number;
    /** @hidden */
    _retryDelay: number;
    /** @hidden */
    _timeout: number;
    /** @hidden */
    _autoReconnect: boolean;
    /** @hidden */
    _connection: typeof Connection;
    /** @hidden */
    _initRequest: Api.InitConnection;
    /** @hidden */
    _sender?: MTProtoSender;
    /** @hidden */
    _floodWaitedRequests: any;
    /** @hidden */
    _borrowedSenderPromises: any;
    /** @hidden */
    _bot?: boolean;
    /** @hidden */
    _useIPV6: boolean;
    /** @hidden */
    _selfInputPeer?: Api.InputPeerUser;
    /** @hidden */
    useWSS: boolean;
    /** @hidden */
    _eventBuilders: [EventBuilder, CallableFunction][];
    /** @hidden */
    _entityCache: EntityCache;
    /** @hidden */
    _lastRequest?: number;
    /** @hidden */
    _parseMode?: ParseInterface;
    /** @hidden */
    _ALBUMS: Map<string, [Timeout, Api.TypeUpdate[]]>;
    /** @hidden */
    private _exportedSenderPromises;
    /** @hidden */
    private _exportedSenderReleaseTimeouts;
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
    testServers: boolean;
    /** @hidden */
    networkSocket: typeof PromisedNetSockets | typeof PromisedWebSockets;
    _connectedDeferred: Deferred<void>;
    constructor(session: string | Session, apiId: number, apiHash: string, clientParams: TelegramClientParams);
    get floodSleepThreshold(): number;
    set floodSleepThreshold(value: number);
    set maxConcurrentDownloads(value: number);
    _initSession(): Promise<void>;
    get connected(): boolean | undefined;
    disconnect(): Promise<void>;
    get disconnected(): boolean;
    _disconnect(): Promise<void>;
    /**
     * Disconnects all senders and removes all handlers
     * Disconnect is safer as it will not remove your event handlers
     */
    destroy(): Promise<void>;
    /** @hidden */
    _authKeyCallback(authKey: AuthKey, dcId: number): Promise<void>;
    /** @hidden */
    _cleanupExportedSender(dcId: number): Promise<void>;
    /** @hidden */
    _connectSender(sender: MTProtoSender, dcId: number): Promise<MTProtoSender>;
    /** @hidden */
    _borrowExportedSender(dcId: number, shouldReconnect?: boolean, existingSender?: MTProtoSender): Promise<MTProtoSender>;
    /** @hidden */
    _createExportedSender(dcId: number): MTProtoSender;
    /** @hidden */
    getSender(dcId: number): Promise<MTProtoSender>;
    getDC(dcId: number, download: boolean): Promise<{
        id: number;
        ipAddress: string;
        port: number;
    }>;
    invoke<R extends Api.AnyRequest>(request: R): Promise<R["__response"]>;
    setLogLevel(level: LogLevel): void;
    get logger(): Logger;
}
