"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramBaseClient = void 0;
const __1 = require("../");
const Helpers_1 = require("../Helpers");
const connection_1 = require("../network/connection");
const sessions_1 = require("../sessions");
const extensions_1 = require("../extensions");
const tl_1 = require("../tl");
const os_1 = __importDefault(require("./os"));
const entityCache_1 = require("../entityCache");
const markdown_1 = require("../extensions/markdown");
const network_1 = require("../network");
const AllTLObjects_1 = require("../tl/AllTLObjects");
const TCPMTProxy_1 = require("../network/connection/TCPMTProxy");
const async_mutex_1 = require("async-mutex");
const Logger_1 = require("../extensions/Logger");
const platform_1 = require("../platform");
const Deferred_1 = __importDefault(require("../extensions/Deferred"));
const EXPORTED_SENDER_RECONNECT_TIMEOUT = 1000; // 1 sec
const EXPORTED_SENDER_RELEASE_TIMEOUT = 30000; // 30 sec
const DEFAULT_DC_ID = 4;
const DEFAULT_IPV4_IP = platform_1.isNode ? "149.154.167.91" : "vesta.web.telegram.org";
const DEFAULT_IPV6_IP = "2001:067c:04e8:f004:0000:0000:0000:000a";
const clientParamsDefault = {
    connection: platform_1.isNode ? connection_1.ConnectionTCPFull : connection_1.ConnectionTCPObfuscated,
    networkSocket: platform_1.isNode ? extensions_1.PromisedNetSockets : extensions_1.PromisedWebSockets,
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
    langPack: "",
    _securityChecks: true,
    useWSS: platform_1.isBrowser ? window.location.protocol == "https:" : false,
    testServers: false,
};
class TelegramBaseClient {
    constructor(session, apiId, apiHash, clientParams) {
        var _a;
        /** The current gramJS version. */
        this.__version__ = __1.version;
        /** @hidden */
        this._ALBUMS = new Map();
        /** @hidden */
        this._exportedSenderPromises = new Map();
        /** @hidden */
        this._exportedSenderReleaseTimeouts = new Map();
        clientParams = Object.assign(Object.assign({}, clientParamsDefault), clientParams);
        if (!apiId || !apiHash) {
            throw new Error("Your API ID or Hash cannot be empty or undefined");
        }
        if (clientParams.baseLogger) {
            this._log = clientParams.baseLogger;
        }
        else {
            this._log = new extensions_1.Logger();
        }
        this._log.info("Running gramJS version " + __1.version);
        if (session && typeof session == "string") {
            session = new sessions_1.StoreSession(session);
        }
        if (!(session instanceof sessions_1.Session)) {
            throw new Error("Only StringSession and StoreSessions are supported currently :( ");
        }
        this._floodSleepThreshold = clientParams.floodSleepThreshold;
        this.session = session;
        this.apiId = apiId;
        this.apiHash = apiHash;
        this._useIPV6 = clientParams.useIPV6;
        this._requestRetries = clientParams.requestRetries;
        this._downloadRetries = clientParams.downloadRetries;
        this._connectionRetries = clientParams.connectionRetries;
        this._retryDelay = clientParams.retryDelay || 0;
        this._timeout = clientParams.timeout;
        this._autoReconnect = clientParams.autoReconnect;
        this._proxy = clientParams.proxy;
        this._semaphore = new async_mutex_1.Semaphore(clientParams.maxConcurrentDownloads || 1);
        this.testServers = clientParams.testServers || false;
        this.networkSocket = clientParams.networkSocket || extensions_1.PromisedNetSockets;
        if (!(clientParams.connection instanceof Function)) {
            throw new Error("Connection should be a class not an instance");
        }
        this._connection = clientParams.connection;
        let initProxy;
        if ((_a = this._proxy) === null || _a === void 0 ? void 0 : _a.MTProxy) {
            this._connection = TCPMTProxy_1.ConnectionTCPMTProxyAbridged;
            initProxy = new tl_1.Api.InputClientProxy({
                address: this._proxy.ip,
                port: this._proxy.port,
            });
        }
        this._initRequest = new tl_1.Api.InitConnection({
            apiId: this.apiId,
            deviceModel: clientParams.deviceModel || os_1.default.type().toString() || "Unknown",
            systemVersion: clientParams.systemVersion || os_1.default.release().toString() || "1.0",
            appVersion: clientParams.appVersion || "1.0",
            langCode: clientParams.langCode,
            langPack: clientParams.langPack,
            systemLangCode: clientParams.systemLangCode,
            proxy: initProxy,
        });
        this._eventBuilders = [];
        this._floodWaitedRequests = {};
        this._borrowedSenderPromises = {};
        this._bot = undefined;
        this._selfInputPeer = undefined;
        this.useWSS = clientParams.useWSS;
        this._securityChecks = !!clientParams.securityChecks;
        if (this.useWSS && this._proxy) {
            throw new Error("Cannot use SSL with proxies. You need to disable the useWSS client param in TelegramClient");
        }
        this._entityCache = new entityCache_1.EntityCache();
        // These will be set later
        this._config = undefined;
        this._loopStarted = false;
        this._reconnecting = false;
        this._destroyed = false;
        this._isSwitchingDc = false;
        this._connectedDeferred = new Deferred_1.default();
        // parse mode
        this._parseMode = markdown_1.MarkdownParser;
    }
    get floodSleepThreshold() {
        return this._floodSleepThreshold;
    }
    set floodSleepThreshold(value) {
        this._floodSleepThreshold = Math.min(value || 0, 24 * 60 * 60);
    }
    set maxConcurrentDownloads(value) {
        // @ts-ignore
        this._semaphore._value = value;
    }
    // region connecting
    async _initSession() {
        await this.session.load();
        if (!this.session.serverAddress) {
            this.session.setDC(DEFAULT_DC_ID, this._useIPV6 ? DEFAULT_IPV6_IP : DEFAULT_IPV4_IP, this.useWSS ? 443 : 80);
        }
        else {
            this._useIPV6 = this.session.serverAddress.includes(":");
        }
    }
    get connected() {
        return this._sender && this._sender.isConnected();
    }
    async disconnect() {
        await this._disconnect();
        await Promise.all(Object.values(this._exportedSenderPromises)
            .map((promises) => {
            return Object.values(promises).map((promise) => {
                return (promise &&
                    promise.then((sender) => {
                        if (sender) {
                            return sender.disconnect();
                        }
                        return undefined;
                    }));
            });
        })
            .flat());
        Object.values(this._exportedSenderReleaseTimeouts).forEach((timeouts) => {
            Object.values(timeouts).forEach((releaseTimeout) => {
                clearTimeout(releaseTimeout);
            });
        });
        this._exportedSenderPromises.clear();
    }
    get disconnected() {
        return !this._sender || this._sender._disconnected;
    }
    async _disconnect() {
        var _a;
        await ((_a = this._sender) === null || _a === void 0 ? void 0 : _a.disconnect());
    }
    /**
     * Disconnects all senders and removes all handlers
     * Disconnect is safer as it will not remove your event handlers
     */
    async destroy() {
        this._destroyed = true;
        await Promise.all([
            this.disconnect(),
            ...Object.values(this._borrowedSenderPromises).map((promise) => {
                return promise.then((sender) => sender.disconnect());
            }),
        ]);
        this._eventBuilders = [];
    }
    /** @hidden */
    async _authKeyCallback(authKey, dcId) {
        this.session.setAuthKey(authKey, dcId);
        await this.session.save();
    }
    /** @hidden */
    async _cleanupExportedSender(dcId) {
        if (this.session.dcId !== dcId) {
            this.session.setAuthKey(undefined, dcId);
        }
        let sender = await this._exportedSenderPromises.get(dcId);
        this._exportedSenderPromises.delete(dcId);
        await (sender === null || sender === void 0 ? void 0 : sender.disconnect());
    }
    /** @hidden */
    async _connectSender(sender, dcId) {
        // if we don't already have an auth key we want to use normal DCs not -1
        const dc = await this.getDC(dcId, !!sender.authKey.getKey());
        while (true) {
            try {
                await sender.connect(new this._connection({
                    ip: dc.ipAddress,
                    port: dc.port,
                    dcId: dcId,
                    loggers: this._log,
                    proxy: this._proxy,
                    testServers: this.testServers,
                    socket: this.networkSocket,
                }), false);
                if (this.session.dcId !== dcId && !sender._authenticated) {
                    this._log.info(`Exporting authorization for data center ${dc.ipAddress} with layer ${AllTLObjects_1.LAYER}`);
                    const auth = await this.invoke(new tl_1.Api.auth.ExportAuthorization({ dcId: dcId }));
                    this._initRequest.query = new tl_1.Api.auth.ImportAuthorization({
                        id: auth.id,
                        bytes: auth.bytes,
                    });
                    const req = new tl_1.Api.InvokeWithLayer({
                        layer: AllTLObjects_1.LAYER,
                        query: this._initRequest,
                    });
                    await sender.send(req);
                    sender._authenticated = true;
                }
                sender.dcId = dcId;
                sender.userDisconnected = false;
                return sender;
            }
            catch (err) {
                if (err.errorMessage === "DC_ID_INVALID") {
                    sender._authenticated = true;
                    sender.userDisconnected = false;
                    return sender;
                }
                if (this._log.canSend(Logger_1.LogLevel.ERROR)) {
                    console.error(err);
                }
                await (0, Helpers_1.sleep)(1000);
                await sender.disconnect();
            }
        }
    }
    /** @hidden */
    async _borrowExportedSender(dcId, shouldReconnect, existingSender) {
        if (!this._exportedSenderPromises.get(dcId) || shouldReconnect) {
            this._exportedSenderPromises.set(dcId, this._connectSender(existingSender || this._createExportedSender(dcId), dcId));
        }
        let sender;
        try {
            sender = await this._exportedSenderPromises.get(dcId);
            if (!sender.isConnected()) {
                if (sender.isConnecting) {
                    await (0, Helpers_1.sleep)(EXPORTED_SENDER_RECONNECT_TIMEOUT);
                    return this._borrowExportedSender(dcId, false, sender);
                }
                else {
                    return this._borrowExportedSender(dcId, true, sender);
                }
            }
        }
        catch (err) {
            if (this._log.canSend(Logger_1.LogLevel.ERROR)) {
                console.error(err);
            }
            return this._borrowExportedSender(dcId, true);
        }
        if (this._exportedSenderReleaseTimeouts.get(dcId)) {
            clearTimeout(this._exportedSenderReleaseTimeouts.get(dcId));
            this._exportedSenderReleaseTimeouts.delete(dcId);
        }
        this._exportedSenderReleaseTimeouts.set(dcId, setTimeout(() => {
            this._exportedSenderReleaseTimeouts.delete(dcId);
            sender.disconnect();
        }, EXPORTED_SENDER_RELEASE_TIMEOUT));
        return sender;
    }
    /** @hidden */
    _createExportedSender(dcId) {
        return new network_1.MTProtoSender(this.session.getAuthKey(dcId), {
            logger: this._log,
            dcId,
            retries: this._connectionRetries,
            delay: this._retryDelay,
            autoReconnect: this._autoReconnect,
            connectTimeout: this._timeout,
            authKeyCallback: this._authKeyCallback.bind(this),
            isMainSender: dcId === this.session.dcId,
            onConnectionBreak: this._cleanupExportedSender.bind(this),
            client: this,
            securityChecks: this._securityChecks,
        });
    }
    /** @hidden */
    getSender(dcId) {
        return dcId
            ? this._borrowExportedSender(dcId)
            : Promise.resolve(this._sender);
    }
    // endregion
    async getDC(dcId, download) {
        throw new Error("Cannot be called from here!");
    }
    invoke(request) {
        throw new Error("Cannot be called from here!");
    }
    setLogLevel(level) {
        this._log.setLevel(level);
    }
    get logger() {
        return this._log;
    }
}
exports.TelegramBaseClient = TelegramBaseClient;
