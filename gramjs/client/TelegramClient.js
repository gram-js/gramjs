const log4js = require('log4js')
const Helpers = require('../utils/Helpers')
const errors = require('../errors/rpcerrorlist')
const { addKey } = require('../crypto/RSA')
const { TLRequest } = require('../tl/tlobject')
const Session = require('../sessions/Session')
const os = require('os')
const { GetConfigRequest } = require('../tl/functions/help')
const { LAYER } = require('../tl/AllTLObjects')
const { functions } = require('../tl')
const MTProtoSender = require('../network/MTProtoSender')
const { ConnectionTCPFull } = require('../network/connection/TCPFull')
const DEFAULT_DC_ID = 4
const DEFAULT_IPV4_IP = '149.154.167.51'
const DEFAULT_IPV6_IP = '[2001:67c:4e8:f002::a]'
const DEFAULT_PORT = 443

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
        baseLogger: 'gramjs',
    }

    constructor(sessionName, apiId, apiHash, opts = TelegramClient.DEFAULT_OPTIONS) {
        if (apiId === undefined || apiHash === undefined) {
            throw Error('Your API ID or Hash are invalid. Please read "Requirements" on README.md')
        }
        const args = { ...TelegramClient.DEFAULT_OPTIONS, ...opts }
        console.log("actual args are : ",args)
        this.apiId = apiId
        this.apiHash = apiHash
        this._useIPV6 = args.useIPV6

        if (typeof args.baseLogger == 'string') {
            this._log = log4js.getLogger(args.baseLogger)
        } else {
            this._log = args.baseLogger
        }
        const session = Session.tryLoadOrCreateNew(sessionName)
        console.log(session.serverAddress)
        if (!session.serverAddress || (session.serverAddress.includes(':') !== this._useIPV6)) {
            session.setDC(DEFAULT_DC_ID, this._useIPV6 ? DEFAULT_IPV6_IP : DEFAULT_IPV4_IP, DEFAULT_PORT)
        }
        this.floodSleepLimit = args.floodSleepLimit

        this.session = session
        // this._entityCache = EntityCache();
        this.apiId = parseInt(apiId)
        this.apiHash = apiHash

        this._requestRetries = args.requestRetries
        this._connectionRetries = args.connectionRetries
        this._retryDelay = args.retryDelay || 0
        if (args.proxy) {
            this._log.warn('proxies are not supported')
        }
        this._proxy = args.proxy
        this._timeout = args.timeout
        this._autoReconnect = args.autoReconnect

        this._connection = args.connection
        // TODO add proxy support

        this._floodWaitedRequests = {}

        this._initWith = (x) => {
            return new functions.InvokeWithLayerRequest({
                layer: LAYER,
                query: new functions.InitConnectionRequest({
                    apiId: this.apiId,
                    deviceModel: args.deviceModel || os.type().toString() || 'Unknown',
                    systemVersion: args.systemVersion || os.release().toString() || '1.0',
                    appVersion: args.appVersion || '1.0',
                    langCode: args.langCode,
                    langPack: '', // this should be left empty.
                    systemLangCode: args.systemLangCode,
                    query: x,
                    proxy: null, // no proxies yet.
                }),
            })
        }
        // These will be set later
        this._config = null
        this._sender = new MTProtoSender(this.session.authKey, {
            logger: this._log,
        })
        this.phoneCodeHashes = []
    }


    // region Connecting

    /**
     * Connects to the Telegram servers, executing authentication if required.
     * Note that authenticating to the Telegram servers is not the same as authenticating
     * the app, which requires to send a code first.
     * @returns {Promise<void>}
     */
    async connect() {
        const connection = new this._connection(this.session.serverAddress
            , this.session.port, this.session.dcId, this._log)
        if (!await this._sender.connect(connection)) {
            return
        }
        this.session.authKey = this._sender.authKey
        await this.session.save()
        await this._sender.send(this._initWith(
            new GetConfigRequest(),
        ))
    }


    /**
     * Disconnects from the Telegram server
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (this._sender) {
            await this._sender.disconnect()
        }
    }


    async _switchDC(newDc) {
        this._log.info(`Reconnecting to new data center ${newDc}`)
        const DC = this._getDC(newDc)

        this.session.setDC(DC.id, DC.ipAddress, DC.port)
        // authKey's are associated with a server, which has now changed
        // so it's not valid anymore. Set to None to force recreating it.
        this._sender.authKey.key = null
        this.session.authKey = null
        await this.session.save()
        await this.disconnect()
        return await this.connect()
    }

    async _authKeyCallback(authKey) {
        this.session.auth_key = authKey
        await this.session.save()
    }

    // endregion

    // region Working with different connections/Data Centers

    async _getDC(dcId, cdn = false) {
        if (!this._config) {
            this._config = await this.invoke(new functions.help.GetConfigRequest())
        }

        if (cdn && !this._cdnConfig) {
            this._cdnConfig = await this.invoke(new functions.help.GetCdnConfigRequest())
            for (const pk of this._cdnConfig.publicKeys) {
                addKey(pk.publicKey)
            }
        }
        for (const DC of this._config.dcOptions) {
            if (DC.id === dcId && DC.ipv6 === this._useIPV6 && DC.cdn === cdn) {
                return DC
            }
        }
    }

    // endregion

    // region Invoking Telegram request
    /**
     * Invokes a MTProtoRequest (sends and receives it) and returns its result
     * @param request
     * @returns {Promise}
     */
    async invoke(request) {
        if (!(request instanceof TLRequest)) {
            throw new Error('You can only invoke MTProtoRequests')
        }
        if (request.CONSTRUCTOR_ID in this._floodWaitedRequests) {
            const due = this._floodWaitedRequests[request.CONSTRUCTOR_ID]
            const diff = Math.round(due - new Date().getTime() / 1000)
            if (diff <= 3) {
                delete this._floodWaitedRequests[request.CONSTRUCTOR_ID]
            } else if (diff <= this.floodSleepLimit) {
                this._log.info(`Sleeping early for ${diff}s on flood wait`)
                await Helpers.sleep(diff)
                delete this._floodWaitedRequests[request.CONSTRUCTOR_ID]
            } else {
                throw new errors.FloodWaitError({
                    request: request,
                    capture: diff,
                })
            }
        }
        this._last_request = new Date().getTime()
        let attempt = 0
        for (attempt = 0; attempt < this._requestRetries; attempt++) {
            try {
                const promise = this._sender.send(request)
                const result = await promise
                this.session.processEntities(result)
                this._entityCache.add(result)
                return result
            } catch (e) {
                if (e instanceof errors.ServerError || e instanceof errors.RpcCallFailError ||
                    e instanceof errors.RpcMcgetFailError) {
                    this._log.warn(`Telegram is having internal issues ${e.constructor.name}`)
                    await Helpers.sleep(2)
                } else if (e instanceof errors.FloodWaitError || e instanceof errors.FloodTestPhoneWaitError) {
                    this._floodWaitedRequests = new Date().getTime() / 1000 + e.seconds
                    if (e.seconds <= this.floodSleepLimit) {
                        this._log.info(`Sleeping for ${e.seconds}s on flood wait`)
                        await Helpers.sleep(e.seconds)
                    } else {
                        throw e
                    }
                } else if (e instanceof errors.PhoneMigrateError || e instanceof errors.NetworkMigrateError ||
                    e instanceof errors.UserMigrateError) {
                    this._log.info(`Phone migrated to ${e.newDc}`)
                    const shouldRaise = e instanceof errors.PhoneMigrateError || e instanceof errors.NetworkMigrateError
                    if (shouldRaise && await this.isUserAuthorized()) {
                        throw e
                    }
                    await this._switchDC(e.newDc)
                }
            }
        }
        throw new Error(`Request was unsuccessful ${attempt} time(s)`)
    }

    // endregion
}

module.exports = TelegramClient
