import {version} from "../index";
import {IS_NODE} from "../Helpers";
import {ConnectionTCPFull, ConnectionTCPObfuscated} from "../network/connection";
import {Session} from "../sessions/Abstract";
import {Logger} from "../extensions";
import {StoreSession, StringSession} from "../sessions";
import {Api} from "../tl";


import os from 'os';
import {LAYER} from "../tl/AllTLObjects";
import {AuthKey} from "../crypto/AuthKey";
import {EntityCache} from "../entityCache";
import {UpdateMethods} from "./updates";
import {MTProtoSender, UpdateConnectionState} from "../network";
import {UserMethods} from "./users";

const DEFAULT_DC_ID = 1;
const DEFAULT_IPV4_IP = IS_NODE ? '149.154.167.51' : 'pluto.web.telegram.org';
const DEFAULT_IPV6_IP = '[2001:67c:4e8:f002::a]';

export interface TelegramClientParams {
    connection?: any,
    useIPV6?: false,
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
    useWSS?: false,
}

export class TelegramBaseClient {


    __version__ = version;
    _config ?: Api.Config;
    public _log: Logger;
    public _floodSleepThreshold: number;
    public session: StringSession|StoreSession;
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
    public _selfInputPeer?: Api.InputPeerUser;
    public useWSS: boolean;
    public _eventBuilders: any[];
    public _entityCache: EntityCache;

    downloadMedia(...args: any) {
        return undefined;
    }

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
        useWSS = false,
    }: TelegramClientParams) {
        if (!apiId || !apiHash) {
            throw new Error("Your API ID or Hash cannot be empty or undefined");
        }
        if (typeof baseLogger == 'string') {
            this._log = new Logger()
        } else {
            this._log = baseLogger
        }
        if (!(session instanceof StoreSession) && !(session instanceof StringSession)) {
            throw new Error("Only StringSession and StoreSessions are supported currently :( ");
        }
        this._floodSleepThreshold = floodSleepThreshold;
        this.session = session;
        this.apiId = apiId;
        this.apiHash = apiHash;
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

        if (!this.session.serverAddress) {
            this.session.setDC(DEFAULT_DC_ID, DEFAULT_IPV4_IP, this.useWSS ? 443 : 80)
        }
    }


    async connect() {
        await this._initSession();

        this._sender = new MTProtoSender(this.session.getAuthKey(), {
            logger: this._log,
            dcId: this.session.dcId,
            retries: this._connectionRetries,
            delay: this._retryDelay,
            autoReconnect: this._autoReconnect,
            connectTimeout: this._timeout,
            authKeyCallback: this._authKeyCallback.bind(this),
            updateCallback: this._handleUpdate.bind(this),
            isMainSender: true,
        });

        const connection = new this._connection(this.session.serverAddress
            , this.session.port, this.session.dcId, this._log);
        if (!await this._sender.connect(connection, this._dispatchUpdate.bind(this))) {
            return
        }
        this.session.setAuthKey(this._sender.authKey);
        await this.session.save();
        this._initRequest.query = new Api.help.GetConfig();
        await this._sender.send(new Api.InvokeWithLayer(
            {
                layer: LAYER,
                query: this._initRequest
            }
        ));

        this._dispatchUpdate({update: new UpdateConnectionState(1)});
        this._updateLoop()
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

    async _switchDC(newDc: number) {
        this._log.info(`Reconnecting to new data center ${newDc}`);
        const DC = await this.getDC(newDc);
        this.session.setDC(newDc, DC.ipAddress, DC.port);
        // authKey's are associated with a server, which has now changed
        // so it's not valid anymore. Set to None to force recreating it.
        await this._sender.authKey.setKey();
        this.session.setAuthKey();
        await this.disconnect();
        return this.connect()
    }

    async _authKeyCallback(authKey: AuthKey, dcId: number) {
        this.session.setAuthKey(authKey, dcId);
        await this.session.save();
    }

    // endregion

    // region Working with different connections/Data Centers

    removeSender(dcId: number) {
        delete this._borrowedSenderPromises[dcId]
    }

    async _borrowExportedSender(dcId: number, retries = 5) {
        let senderPromise = this._borrowedSenderPromises[dcId];
        if (!senderPromise) {
            senderPromise = this._createExportedSender(dcId, retries);
            this._borrowedSenderPromises[dcId] = senderPromise;

            senderPromise.then((sender: any) => {
                if (!sender) {
                    delete this._borrowedSenderPromises[dcId]
                }
            })
        }
        return senderPromise
    }

    async _createExportedSender(dcId: number, retries: number) {
        const dc = await this.getDC(dcId);
        const sender = new MTProtoSender(this.session.getAuthKey(dcId),
            {
                logger: this._log,
                dcId: dcId,
                retries: this._connectionRetries,
                delay: this._retryDelay,
                autoReconnect: this._autoReconnect,
                connectTimeout: this._timeout,
                authKeyCallback: this._authKeyCallback.bind(this),
                isMainSender: dcId === this.session.dcId,
                senderCallback: this.removeSender.bind(this),
            });
        for (let i = 0; i < retries; i++) {
            try {
                await sender.connect(new this._connection(
                    dc.ipAddress,
                    dc.port,
                    dcId,
                    this._log,
                ));
                if (this.session.dcId !== dcId) {
                    this._log.info(`Exporting authorization for data center ${dc.ipAddress}`);
                    const auth = await this.invoke(new Api.auth.ExportAuthorization({dcId: dcId}));
                    this._initRequest.query = new Api.auth.ImportAuthorization({
                            id: auth.id,
                            bytes: auth.bytes,
                        },
                    )
                    const req = new Api.InvokeWithLayer({
                        layer: LAYER,
                        query: this._initRequest
                    });
                    await sender.send(req)
                }
                sender.dcId = dcId;
                return sender
            } catch (e) {
                console.log(e);
                await sender.disconnect()
            }
        }
        return null
    }

    async getDC(dcId: number): Promise<{ id: number, ipAddress: string, port: number }> {
        if (!IS_NODE) {
            switch (dcId) {
                case 1:
                    return {
                        id: 1,
                        ipAddress: 'pluto.web.telegram.org',
                        port: 443,
                    };
                case 2:
                    return {
                        id: 2,
                        ipAddress: 'venus.web.telegram.org',
                        port: 443,
                    };
                case 3:
                    return {
                        id: 3,
                        ipAddress: 'aurora.web.telegram.org',
                        port: 443,
                    };
                case 4:
                    return {
                        id: 4,
                        ipAddress: 'vesta.web.telegram.org',
                        port: 443,
                    };
                case 5:
                    return {
                        id: 5,
                        ipAddress: 'flora.web.telegram.org',
                        port: 443,
                    };
                default:
                    throw new Error(`Cannot find the DC with the ID of ${dcId}`)
            }
        }
        if (!this._config) {
            this._config = await this.invoke(new Api.help.GetConfig())
        }
        for (const DC of this._config.dcOptions) {
            if (DC.id === dcId) {
                return {
                    id: DC.id,
                    ipAddress: DC.ipAddress,
                    port: 443,
                }
            }
        }
        throw new Error(`Cannot find the DC with the ID of ${dcId}`)
    }

    // endregion


}

export interface TelegramBaseClient {
    invoke<R extends Api.AnyRequest>(request: R): Promise<R['__response']>;

    _dispatchUpdate(args: { update: UpdateConnectionState | any }): Promise<void>;

    _updateLoop(): Promise<void>;

    _handleUpdate(update: Api.TypeUpdate | number): void;
}
