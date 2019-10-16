const Session = require("./Session");
const doAuthentication = require("../network/Authenticator");
const MtProtoSender = require("../network/mtprotoSender");
const MTProtoRequest = require("../tl/MTProtoRequest");
const {ImportBotAuthorizationRequest} = require("./functions/auth");
const {ConnectionTCPFull} = require("../network/connection/TCPFull");
const {TLRequest} = require("./tlobject");
const {InvokeWithLayerRequest, InitConnectionRequest} = require("./functions/index");
const {GetConfigRequest} = require("./functions/help");
const {LAYER} = require("../tl/alltlobjects");
const log4js = require('log4js');

class TelegramClient {

    constructor(sessionUserId, apiId, apiHash, connection = ConnectionTCPFull) {
        if (apiId === undefined || apiHash === undefined) {
            throw Error("Your API ID or Hash are invalid. Please read \"Requirements\" on README.md");
        }

        this.apiId = apiId;
        this.apiHash = apiHash;
        this._connection = ConnectionTCPFull;
        this._log = log4js.getLogger("gramjs");
        this._initWith = (x) => {
            return new InvokeWithLayerRequest({
                layer: LAYER,
                query: new InitConnectionRequest({
                    apiId: this.apiId,
                    deviceModel: "Windows",
                    systemVersion: "1.8.3",
                    appVersion: "1.8",
                    langCode: "en",
                    langPack: "",
                    systemLangCode: "en",
                    query: x,
                    proxy: null,
                })
            })
        };
        this.session = Session.tryLoadOrCreateNew(sessionUserId);
        //These will be set later
        this.dcOptions = null;
        this._sender = new MtProtoSender(this.session.authKey, {
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
        let connection = new this._connection(this.session.serverAddress, this.session.port, this.session.dcId, this._log);
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
        let res = await this._sender.send(request);
        return res;
    }


    /**
     * Logs in to Telegram to an existing user or bot account.

     You should only use this if you are not authorized yet.

     This method will send the code if it's not provided.

     .. note::

     In most cases, you should simply use `start()` and not this method.

     * @param args {{botToken: string}}
     * @returns {Promise<void>}
     */
    async signIn(args = {phone: null, code: null, password: null, botToken: null, phoneCodeHash: null}) {
        let botToken = args.botToken;
        let request = new ImportBotAuthorizationRequest({
            flags: 0,
            botAuthToken: botToken,
            apiId: this.apiId,
            apiHash: this.apiHash,
        });
        let result = await this.invoke(request);
    }
}

module.exports = TelegramClient;
