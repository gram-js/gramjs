const log4js = require('log4js')
const Helpers = require('../utils/Helpers')
const errors = require('../errors')
const { addKey } = require('../crypto/RSA')
const { TLRequest } = require('../tl/tlobject')
const Session = require('../sessions/Session')
const os = require('os')
const { GetConfigRequest } = require('../tl/functions/help')
const { LAYER } = require('../tl/AllTLObjects')
const { functions, types } = require('../tl')
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
        this.apiId = apiId
        this.apiHash = apiHash
        this._useIPV6 = args.useIPV6
        this._entityCache = new Set()
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
        this._eventBuilders = []

        this._phoneCodeHash = {}
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
        const DC = await this._getDC(newDc)
        console.log('dc is ?????????')
        this.session.setDC(DC.id, DC.ipAddress, DC.port)
        console.log('the dc is ', DC)
        // authKey's are associated with a server, which has now changed
        // so it's not valid anymore. Set to None to force recreating it.
        this._sender.authKey.key = null
        this.session.authKey = null
        await this.session.save()
        await this.disconnect()
        console.log('hayyyyyyyyyy')
        return await this.connect()
    }

    async _authKeyCallback(authKey) {
        this.session.auth_key = authKey
        await this.session.save()
    }

    // endregion

    // region Working with different connections/Data Centers

    async _getDC(dcId, cdn = false) {
        console.log('hi dc ?')
        if (!this._config) {
            this._config = await this.invoke(new functions.help.GetConfigRequest())
        }
        console.log('h')
        if (cdn && !this._cdnConfig) {
            this._cdnConfig = await this.invoke(new functions.help.GetCdnConfigRequest())
            for (const pk of this._cdnConfig.publicKeys) {
                addKey(pk.publicKey)
            }
        }
        console.log('ok')
        for (const DC of this._config.dcOptions) {
            console.log(DC)
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
        console.log('sending request..', request)
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
                console.log('sending promise')
                const promise = this._sender.send(request)
                console.log(promise)
                const result = await promise
                console.log('the res is : ', result)
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
                } else {
                    throw e
                }
            }
        }
        throw new Error(`Request was unsuccessful ${attempt} time(s)`)
    }

    async getMe() {
        const me = (await this.invoke(new functions.users
            .GetUsersRequest({ id: [new types.InputUserSelf()] })))[0]
        return me
    }

    async signIn(args = {
        phone: null,
        code: null,
        password: null,
        botToken: null,
        phoneCodeHash: null,
    }) {
        let result
        if (args.phone && !args.code && !args.password) {
            return await this.sendCodeRequest(args.phone)
        } else if (args.code) {
            const { phone, phoneCodeHash } =
                this._parsePhoneAndHash(args.phone, args.phoneCodeHash)
            // May raise PhoneCodeEmptyError, PhoneCodeExpiredError,
            // PhoneCodeHashEmptyError or PhoneCodeInvalidError.
            result = await this.invoke(new functions.auth.SignInRequest(
                phone, phoneCodeHash, args.code.toString()))
        } else if (args.password) {
            const pwd = await this.invoke(new functions.account.GetPasswordRequest())
            result = await this.invoke(new functions.auth.CheckPasswordRequest(
                pwdMod.computeCheck(pwd, args.password),
            ))
        } else if (args.botToken) {
            result = await this.invoke(new functions.auth.ImportBotAuthorizationRequest(
                {
                    flags: 0,
                    botAuthToken: args.botToken,
                    apiId: this.apiId,
                    apiHash: this.apiHash,
                },
            ))
        } else {
            throw new Error('You must provide a phone and a code the first time, ' +
                'and a password only if an RPCError was raised before.')
        }
        return this._onLogin(result.user)
    }

    // endregion
    async isUserAuthorized() {
        if (!this._authorized) {
            try {
                await this.invoke(new functions.updates.GetStateRequest())
                this._authorized = true
            } catch (e) {
                this._authorized = false
            }
        }
        return this._authorized
    }

    /**
     * Callback called whenever the login or sign up process completes.
     * Returns the input user parameter.
     * @param user
     * @private
     */
    _onLogin(user) {
        this._bot = Boolean(user.bot)
        this._authorized = true
        return user
    }

    async sendCodeRequest(phone, forceSMS = false) {
        let result
        phone = Helpers.parsePhone(phone) || this._phone
        let phoneHash = this._phoneCodeHash[phone]

        if (!phoneHash) {
            try {
                result = await this.invoke(new functions.auth.SendCodeRequest({
                    phone: phone,
                    apiId: this.apiId,
                    apiHash: this.apiHash,
                    settings: new types.CodeSettings(),
                }))
            } catch (e) {
                if (e instanceof errors.AuthRestartError) {
                    return await this.sendCodeRequest(phone, forceSMS)
                }
                throw e
            }
            this._tos = result.termsOfService
            this._phoneCodeHash[phone] = phoneHash = result.phoneCodeHash
        } else {
            forceSMS = true
        }
        this._phone = phone
        if (forceSMS) {
            result = await this.invoke(new functions.auth.ResendCodeRequest({
                phone: phone,
                phoneHash: phoneHash,
            }))
            this._phoneCodeHash[phone] = result.phoneCodeHash
        }
        return result
    }


    // event region
    addEventHandler(callback, event) {
        this._eventBuilders.append([event, callback])
    }

    _handleUpdate(update) {
        this.session.processEntities(update)
        this._entityCache.add(update)

        if (update instanceof types.Updates || update instanceof types.UpdatesCombined) {
            // TODO deal with entities
            for (const u of update.updates) {
                this._processUpdate(u, update.updates)
            }
        } else if (update instanceof types.UpdateShort) {

            this._processUpdate(update.update, null)
        } else {
            this._processUpdate(update, null)
        }
        this._stateCache.update(update)
    }

    _processUpdate(update, others, entities) {
        update._entities = entities || {}
        const args = {
            update: update,
            others: others,
        }
        this._dispatchUpdate(args)
    }


    // endregion

    async _dispatchUpdate(args = {
        update: null,
        others: null,
        channelId: null,
        ptsDate: null,
    }) {
        for (const [builder, callback] of this._eventBuilders) {
            const event = builder.build()
            await callback(event)
        }
    }
}

module.exports = TelegramClient
