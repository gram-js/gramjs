const log4js = require("log4js");
const Session = require("../sessions/Session");
const os = require('os');
const {GetConfigRequest} = require("../tl/functions/help");
const {LAYER} = require("../tl/alltlobjects");
const {functions} = require("../tl");
const MTProtoSender = require("../network/MTProtoSender");
const {ConnectionTCPFull} = require("../network/connection/TCPFull");
DEFAULT_DC_ID = 4;
DEFAULT_IPV4_IP = '149.154.167.51';
DEFAULT_IPV6_IP = '[2001:67c:4e8:f002::a]';
DEFAULT_PORT = 443;

class TelegramClient {

    static DEFAULT_OPTIONS = {
        connection: ConnectionTCPFull,
        useIPV6: false,
        proxy: null,
        timeout: 10,
        requestRetries: 5,
        connectionRetries: 5,
        retryDelay: 1,
        autoReconnect: true,
        sequentialUpdates: false,
        FloodSleepLimit: 60,
        deviceModel: null,
        systemVersion: null,
        appVersion: null,
        langCode: 'en',
        systemLangCode: 'en',
        baseLogger: null
    };

    constructor(sessionName, apiId, apiHash, opts = TelegramClient.DEFAULT_OPTIONS) {
        if (apiId === undefined || apiHash === undefined) {
            throw Error("Your API ID or Hash are invalid. Please read \"Requirements\" on README.md");
        }
        const args = {...TelegramClient.DEFAULT_OPTIONS, ...opts};
        this.apiId = apiId;
        this.apiHash = apiHash;
        this._useIPV6 = args.useIPV6;

        if (typeof args.baseLogger == 'string') {
            this._log = log4js.getLogger(args.baseLogger);
        } else {
            this._log = args.baseLogger;
        }
        const session = Session.tryLoadOrCreateNew(sessionName);

        if (!session.serverAddress || (session.serverAddress.includes(":") !== this._useIPV6)) {
            session.setDc(DEFAULT_DC_ID, this._useIPV6 ? DEFAULT_IPV6_IP : DEFAULT_IPV4_IP, DEFAULT_PORT)
        }
        this.FloodSleepLimit = args.FloodSleepLimit;

        this.session = session;
        //this._entityCache = EntityCache();
        this.apiId = parseInt(apiId);
        this.apiHash = apiHash;

        this._requestRetries = args.requestRetries;
        this._connectionRetries = args.connectionRetries;
        this._retryDelay = args.retryDelay || 0;
        if (args.proxy) {
            this._log.warn("proxies are not supported");
        }
        this._proxy = args.proxy;
        this._timeout = args.timeout;
        this._autoReconnect = args.autoReconnect;

        this._connection = args.connection;
        //TODO add proxy support


        this._initWith = (x) => {
            return new functions.InvokeWithLayerRequest({
                layer: LAYER,
                query: new functions.InitConnectionRequest({
                    apiId: this.apiId,
                    deviceModel: args.deviceModel | os.type() | "Unkown",
                    systemVersion: args.systemVersion | os.release() | '1.0',
                    appVersion: args.appVersion | this.__version__,
                    langCode: args.langCode,
                    langPack: "", //this should be left empty.
                    systemLangCode: args.systemVersion,
                    query: x,
                    proxy: null, // no proxies yet.
                })
            })
        };
        //These will be set later
        this._sender = new MTProtoSender(this.session.authKey, {
            logger: this._log,
        });
        this.phoneCodeHashes = Array();

    }


    /**
     * Connects to the Telegram servers, executing authentication if required.
     * Note that authenticating to the Telegram servers is not the same as authenticating
     * the app, which requires to send a code first.
     * @returns {Promise<void>}
     */
    async connect() {
        const connection = new this._connection(this.session.serverAddress, this.session.port, this.session.dcId, this._log);
        if (!await this._sender.connect(connection)) {
            return;
        }
        this.session.authKey = this._sender.authKey;
        await this.session.save();
        await this._sender.send(this._initWith(
            new GetConfigRequest()
        ));

    }


    /**
     * Disconnects from the Telegram server
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (this._sender) {
            await this._sender.disconnect();
        }
    }

    /**
     * Invokes a MTProtoRequest (sends and receives it) and returns its result
     * @param request
     * @returns {Promise}
     */
    async invoke(request) {
        if (!(request instanceof TLRequest)) {
            throw new Error("You can only invoke MTProtoRequests");
        }
        return this._sender.send(request);
    }


}

module.exports = TelegramClient;