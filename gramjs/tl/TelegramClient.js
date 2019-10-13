const Session = require("./Session");
const doAuthentication = require("../network/Authenticator");
const MtProtoSender = require("../network/mtprotoSender");
const MTProtoRequest = require("../tl/MTProtoRequest");
const {ConnectionTCPFull} = require("../network/connection/TCPFull");
const {InvokeWithLayerRequest, InitConnectionRequest} = require("./functions/index");
const {GetConfigRequest} = require("./functions/help");
const {LAYER} = require("../tl/alltlobjects");

class TelegramClient {

    constructor(sessionUserId, apiId, apiHash, connection = ConnectionTCPFull) {
        if (apiId === undefined || apiHash === undefined) {
            throw Error("Your API ID or Hash are invalid. Please read \"Requirements\" on README.md");
        }

        this.apiId = apiId;
        this.apiHash = apiHash;
        this._connection = ConnectionTCPFull;
        this._initWith = (x) => {
            return new InvokeWithLayerRequest({
                layer: LAYER,
                query: new InitConnectionRequest({
                    apiId: this.apiId,
                    deviceModel: "Windows",
                    systemVersion: "1.8.3",
                    appVersion: "1.8",
                    langCode: "en",
                    systemLangCode: "en",
                    query: x,
                    proxy: null,
                })
            })
        };
        this.session = Session.tryLoadOrCreateNew(sessionUserId);
        //These will be set later
        this.dcOptions = null;
        this._sender = new MtProtoSender(this.session.authKey);
        this.phoneCodeHashes = Array();

    }


    /**
     * Connects to the Telegram servers, executing authentication if required.
     * Note that authenticating to the Telegram servers is not the same as authenticating
     * the app, which requires to send a code first.
     * @returns {Promise<void>}
     */
    async connect() {
        let connection = new this._connection(this.session.serverAddress, this.session.port, this.session.dcId, null);
        if (!await this._sender.connect(connection)) {
            return;
        }
        console.log("ok");
        this.session.authKey = this._sender.authKey;
        await this.session.save();
        await this._sender.send(this._initWith(
            new GetConfigRequest()
        ));

    }

    /**
     * Reconnects to the specified DC ID. This is automatically called after an InvalidDCError is raised
     * @param dc_id {number}
     */
    async reconnect_to_dc(dc_id) {

        if (this.dcOptions === undefined || this.dcOptions.length === 0) {
            throw new Error("Can't reconnect. Stabilise an initial connection first.");
        }
        let dc;
        for (dc of this.dcOptions) {
            if (dc.id === dc_id) {
                break;
            }
        }
        await this.transport.close();
        this.transport = new TcpTransport(dc.ipAddress, dc.port);
        await this.transport.connect();
        this.session.server_address = dc.ipAddress;
        this.session.port = dc.port;
        this.session.save();
        await this.connect();
    }

    /**
     * Disconnects from the Telegram server
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (this.sender) {
            await this.sender.disconnect();
        }
    }

    /**
     * Invokes a MTProtoRequest (sends and receives it) and returns its result
     * @param request
     * @returns {Promise}
     */
    async invoke(request) {
        if (!(request instanceof MTProtoRequest)) {
            throw new Error("You can only invoke MTProtoRequests");
        }
        await this.sender.send(request);

        await this.sender.receive(request);
        return request.result;
    }
}

module.exports = TelegramClient;
