import {version} from "../";
import {IS_NODE} from "../Helpers";
import {ConnectionTCPFull, ConnectionTCPObfuscated} from "../network/connection";
import type {Session} from "../sessions/Abstract";
import {Logger} from "../extensions";
import {StoreSession, StringSession} from "../sessions";
import {Api} from "../tl";


import os from 'os';
import type {AuthKey} from "../crypto/AuthKey";
import {EntityCache} from "../entityCache";
import type {ParseInterface} from "./messageParse";
import type {EventBuilder} from "../events/common";

const DEFAULT_DC_ID = 1;
const DEFAULT_IPV4_IP = IS_NODE ? '149.154.167.51' : 'pluto.web.telegram.org';
const DEFAULT_IPV6_IP = '2001:67c:4e8:f002::a';

export interface TelegramClientParams {
    connection?: any,
    useIPV6?: boolean,
    timeout?: number,
    requestRetries?: number,
    connectionRetries?: number,
    retryDelay?: number,
    autoReconnect?: boolean,
    sequentialUpdates?: boolean,
    floodSleepThreshold?: number,
    deviceModel?: string,
    systemVersion?: string,
    appVersion?: string,
    langCode?: 'en',
    systemLangCode?: 'en',
    baseLogger?: string | any,
    useWSS?: boolean,
}

export class TelegramBaseClient {


    __version__ = version;
    _config ?: Api.Config;
    public _log: Logger;
    public _floodSleepThreshold: number;
    public session: Session;
    public apiHash: string;
    public apiId: number;
    public _requestRetries: number;
    public _connectionRetries: number;
    public _retryDelay: number;
    public _timeout: number;
    public _autoReconnect: boolean;
    public _connection: any;
    public _initRequest: Api.InitConnection;
    public _sender?: any;
    public _floodWaitedRequests: any;
    public _borrowedSenderPromises: any;
    public _bot?: boolean;
    public _useIPV6: boolean;
    public _selfInputPeer?: Api.InputPeerUser;
    public useWSS: boolean;
    public _eventBuilders: [EventBuilder, CallableFunction][];
    public _entityCache: EntityCache;
    public _lastRequest?: number;
    public _parseMode?: ParseInterface;

    constructor(session: string | Session, apiId: number, apiHash: string, {
        connection = IS_NODE ? ConnectionTCPFull : ConnectionTCPObfuscated,
        useIPV6 = false,
        timeout = 10,
        requestRetries = 5,
        connectionRetries = Infinity,
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
        useWSS = typeof window !== 'undefined' ? window.location.protocol == 'https:' : false,
    }: TelegramClientParams) {
        if (!apiId || !apiHash) {
            throw new Error("Your API ID or Hash cannot be empty or undefined");
        }
        if (typeof baseLogger == 'string') {
            this._log = new Logger()
        } else {
            this._log = baseLogger
        }
        this._log.debug("Running gramJS version "+version);
        if (!(session instanceof StoreSession) && !(session instanceof StringSession)) {
            throw new Error("Only StringSession and StoreSessions are supported currently :( ");
        }
        this._floodSleepThreshold = floodSleepThreshold;
        this.session = session;
        this.apiId = apiId;
        this.apiHash = apiHash;
        this._useIPV6 = useIPV6;
        this._requestRetries = requestRetries;
        this._connectionRetries = connectionRetries;
        this._retryDelay = retryDelay || 0;
        this._timeout = timeout;
        this._autoReconnect = autoReconnect;
        if (!(connection instanceof Function)) {
            throw new Error("Connection should be a class not an instance");
        }
        this._connection = connection;
        this._initRequest = new Api.InitConnection({
            apiId: this.apiId,
            deviceModel: deviceModel || os.type()
                .toString() || 'Unknown',
            systemVersion: systemVersion || os.release()
                .toString() || '1.0',
            appVersion: appVersion || '1.0',
            langCode: langCode,
            langPack: '', // this should be left empty.
            systemLangCode: systemLangCode,
            proxy: undefined, // no proxies yet.
        });
        this._eventBuilders = [];

        this._floodWaitedRequests = {};
        this._borrowedSenderPromises = {};
        this._bot = undefined;
        this._selfInputPeer = undefined;
        this.useWSS = useWSS;
        this._entityCache = new EntityCache()

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

        if (!this.session.serverAddress || this.session.serverAddress.includes(":") !== this._useIPV6) {
            this.session.setDC(DEFAULT_DC_ID, this._useIPV6 ? DEFAULT_IPV6_IP : DEFAULT_IPV4_IP, this.useWSS ? 443 : 80)
        }
    }


    get connected() {
        return this._sender && this._sender.isConnected();
    }

    async disconnect() {
        if (this._sender) {
            await this._sender.disconnect()
        }
    }

    get disconnected() {
        return !this._sender || this._sender.disconnected;
    }

    async destroy() {
        await Promise.all([
            this.disconnect(),
            this.session.delete(),
            ...Object.values(this._borrowedSenderPromises).map((promise: any) => {
                return promise
                    .then((sender: any) => sender.disconnect())
            }),
        ]);

        this._eventBuilders = []
    }


    async _authKeyCallback(authKey: AuthKey, dcId: number) {
        this.session.setAuthKey(authKey, dcId);
        await this.session.save();
    }

    // endregion


}
