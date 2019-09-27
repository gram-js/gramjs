const Session = require("./Session");

class TelegramClient {

    async constructor(sessionUserId, layer, apiId, apiHash) {
        if (apiId === undefined || apiHash === undefined) {
            throw Error("Your API ID or Hash are invalid. Please read \"Requirements\" on README.md");
        }
        this.apiId = apiId;
        this.apiHash = apiHash;

        this.layer = layer;

        this.session = Session.tryLoadOrCreateNew(sessionUserId);
        this.transport = TcpTransport(this.session.serverAddress, this.session.port);

        //These will be set later
        this.dcOptions = undefined;
        this.sender = undefined;
        this.phoneCodeHashes = Array();

    }

    /**
     * Connects to the Telegram servers, executing authentication if required.
     * Note that authenticating to the Telegram servers is not the same as authenticating
     * the app, which requires to send a code first.
     * @param reconnect {Boolean}
     * @returns {Promise<Boolean>}
     */
    async connect(reconnect = false) {
        try {
            if (!this.session.authKey || reconnect) {
                let res = network.authenticator.doAuthentication(this.transport);
                this.session.authKey = res.authKey;
                this.session.timeOffset = res.timeOffset;
                this.session.save();
            }
            this.sender = MtProtoSender(this.transport, this.session);

            // Now it's time to send an InitConnectionRequest
            // This must always be invoked with the layer we'll be using
            let query = InitConnectionRequest({
                apiId: apiId,
                deviceModel: "PlaceHolder",
                systemVersion: "PlaceHolder",
                appVersion: "0.0.1",
                langCode: "en",
                query: GetConfigRequest()
            });
            let result = await this.invoke(InvokeWithLayerRequest({
                layer: this.layer,
                query: query
            }));

            // We're only interested in the DC options
            // although many other options are available!
            this.dcOptions = result.dcOptions;
            return true;
        } catch (error) {
            console.log('Could not stabilise initial connection: {}'.replace("{}", error));
            return false;
        }
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
        this.transport.close();
        this.transport = new TcpTransport(dc.ipAddress, dc.port);
        this.session.server_address = dc.ipAddress;
        this.session.port = dc.port;
        this.session.save();
        await this.connect(true);
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
        if (!MTProtoRequest.prototype.isPrototypeOf(Object.getPrototypeOf(request).prototype)) {
            throw new Error("You can only invoke MtProtoRequests");
        }
        await this.sender.send(request);
        await this.sender.receive(request);
        return request.result;
    }
}