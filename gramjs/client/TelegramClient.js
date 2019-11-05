const log4js = require('log4js')
const { sleep } = require('../Helpers')
const errors = require('../errors')
const { addKey } = require('../crypto/RSA')
const { TLRequest } = require('../tl/tlobject')
const utils = require('../Utils')
const Session = require('../sessions/Session')
const os = require('os')
const { GetConfigRequest } = require('../tl/functions/help')
const { LAYER } = require('../tl/AllTLObjects')
const { functions, types } = require('../tl')
const { computeCheck } = require('../Password')
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
            retries: this._connectionRetries,
            delay: this._retryDelay,
            autoReconnect: this._autoReconnect,
            connectTimeout: this._timeout,
            authKeyCallback: this._authKeyCallback.bind(this),
            updateCallback: this._handleUpdate.bind(this),

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
        this.session.authKey = authKey
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
            if (DC.id === dcId && Boolean(DC.ipv6) === this._useIPV6 && Boolean(DC.cdn) === cdn) {
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
        await request.resolve(this, utils)

        if (request.CONSTRUCTOR_ID in this._floodWaitedRequests) {
            const due = this._floodWaitedRequests[request.CONSTRUCTOR_ID]
            const diff = Math.round(due - new Date().getTime() / 1000)
            if (diff <= 3) {
                delete this._floodWaitedRequests[request.CONSTRUCTOR_ID]
            } else if (diff <= this.floodSleepLimit) {
                this._log.info(`Sleeping early for ${diff}s on flood wait`)
                await sleep(diff)
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
                    await sleep(2000)
                } else if (e instanceof errors.FloodWaitError || e instanceof errors.FloodTestPhoneWaitError) {
                    this._floodWaitedRequests = new Date().getTime() / 1000 + e.seconds
                    if (e.seconds <= this.floodSleepLimit) {
                        this._log.info(`Sleeping for ${e.seconds}s on flood wait`)
                        await sleep(e.seconds * 1000)
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
                    await sleep(1000)
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

    async start(args = {
        phone: null,
        code: null,
        password: null,
        botToken: null,
        forceSMS: null,
        firstName: null,
        lastName: null,
        maxAttempts: 5,
    }) {
        args.maxAttempts = args.maxAttempts || 5

        if (!this.isConnected()) {
            await this.connect()
        }
        if (await this.isUserAuthorized()) {
            return this
        }
        if (!args.botToken) {
            args.phone = utils.parsePhone(args.phone) || args.phone
        }
        if (args.botToken) {
            await this.signIn({
                botToken: args.botToken,
            })
            return this
        }

        let me
        let attempts = 0
        let twoStepDetected = false

        await this.sendCodeRequest(args.phone, args.forceSMS)
        console.log('you  got sent the code')

        let signUp = false
        while (attempts < args.maxAttempts) {
            console.log('try nummber', attempts)
            try {
                const value = args.code
                if (!value) {
                    throw new errors.PhoneCodeEmptyError({
                        request: null,
                    })
                }
                if (signUp) {
                    me = await this.signUp({
                        code: value,
                        firstName: args.firstName,
                        lastName: args.lastName,
                    })
                } else {
                    // this throws SessionPasswordNeededError if 2FA enabled
                    me = await this.signIn({
                        phone: args.phone,
                        code: value,
                    })
                }
                break
            } catch (e) {

                if (e instanceof errors.SessionPasswordNeededError) {
                    twoStepDetected = true
                    break
                } else if (e instanceof errors.PhoneNumberOccupiedError) {
                    signUp = true

                } else if (e instanceof errors.PhoneNumberUnoccupiedError) {
                    signUp = true

                } else if (e instanceof errors.PhoneCodeEmptyError ||
                    e instanceof errors.PhoneCodeExpiredError ||
                    e instanceof errors.PhoneCodeHashEmptyError ||
                    e instanceof errors.PhoneCodeInvalidError) {
                    console.log('Invalid code. Please try again.')
                } else {
                    throw e
                }
            }
            attempts++
        }
        if (attempts >= args.maxAttempts) {
            throw new Error(`${args.maxAttempts} consecutive sign-in attempts failed. Aborting`)
        }
        if (twoStepDetected) {
            console.log('two steps baby')
            if (!args.password) {
                throw new Error('Two-step verification is enabled for this account. ' +
                    'Please provide the \'password\' argument to \'start()\'.')
            }
            me = await this.signIn({
                phone: args.phone,
                password: args.password,
            })
        }
        const name = utils.getDisplayName(me)
        console.log(me)
        console.log('Signed in successfully as', name)
        return this
    }

    async signIn(args = {
        phone: null,
        code: null,
        password: null,
        botToken: null,
        phoneCodeHash: null,
    }) {
        console.log('signing in now')
        let result
        if (args.phone && !args.code && !args.password) {
            console.log('first sign in')
            return await this.sendCodeRequest(args.phone)
        } else if (args.code) {
            const [phone, phoneCodeHash] =
                this._parsePhoneAndHash(args.phone, args.phoneCodeHash)
            // May raise PhoneCodeEmptyError, PhoneCodeExpiredError,
            // PhoneCodeHashEmptyError or PhoneCodeInvalidError.
            result = await this.invoke(new functions.auth.SignInRequest({
                phoneNumber: phone,
                phoneCodeHash: phoneCodeHash,
                phoneCode: args.code.toString(),
            }))
        } else if (args.password) {
            const pwd = await this.invoke(new functions.account.GetPasswordRequest())
            result = await this.invoke(new functions.auth.CheckPasswordRequest({
                    password: computeCheck(pwd, args.password),
                },
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


    _parsePhoneAndHash(phone, phoneHash) {
        phone = utils.parsePhone(phone) || this._phone
        if (!phone) {
            throw new Error('Please make sure to call send_code_request first.')
        }
        phoneHash = phoneHash || this._phoneCodeHash[phone]
        if (!phoneHash) {
            throw new Error('You also need to provide a phone_code_hash.')
        }

        return [phone, phoneHash]
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
        phone = utils.parsePhone(phone) || this._phone
        let phoneHash = this._phoneCodeHash[phone]

        if (!phoneHash) {
            try {
                result = await this.invoke(new functions.auth.SendCodeRequest({
                    phoneNumber: phone,
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

            // If we already sent a SMS, do not resend the code (hash may be empty)
            if (result.type instanceof types.auth.SentCodeTypeSms) {
                forceSMS = false
            }
            console.log('got result', result)
            if (result.phoneCodeHash) {
                console.log('appending hash')
                this._phoneCodeHash[phone] = phoneHash = result.phoneCodeHash
            }
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
        this._eventBuilders.push([event, callback])
    }

    _handleUpdate(update) {

        this.session.processEntities(update)
        this._entityCache.add(update)

        if (update instanceof types.Updates || update instanceof types.UpdatesCombined) {
            // TODO deal with entities
            const entities = {}
            for (const x of [...update.users, ...update.chats]) {
                entities[utils.getPeerId(x)] = x
            }
            for (const u of update.updates) {
                this._processUpdate(u, update.updates, entities)
            }
        } else if (update instanceof types.UpdateShort) {
            this._processUpdate(update.update, null)
        } else {
            this._processUpdate(update, null)
        }
        // TODO add caching
        // this._stateCache.update(update)
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

    // region private methods

    /**
     Gets a full entity from the given string, which may be a phone or
     a username, and processes all the found entities on the session.
     The string may also be a user link, or a channel/chat invite link.

     This method has the side effect of adding the found users to the
     session database, so it can be queried later without API calls,
     if this option is enabled on the session.

     Returns the found entity, or raises TypeError if not found.
     * @param string {string}
     * @returns {Promise<void>}
     * @private
     */
    async _getEntityFromString(string) {
        const phone = utils.parsePhone(string)
        if (phone) {
            try {
                for (const user of (await this.invoke(
                    new functions.contacts.GetContactsRequest(0))).users) {
                    if (user.phone === phone) {
                        return user
                    }
                }
            } catch (e) {
                if (e instanceof errors.BotMethodInvalidError) {
                    throw new Error('Cannot get entity by phone number as a ' +
                        'bot (try using integer IDs, not strings)')
                }
                throw e
            }
        } else if (['me', 'this'].includes(string.toLowerCase())) {
            return await this.getMe()
        } else {
            const { username, isJoinChat } = utils.parseUsername(string)
            if (isJoinChat) {
                const invite = await this.invoke(new functions.messages.CheckChatInviteRequest({
                    'hash': username,
                }))
                if (invite instanceof types.ChatInvite) {
                    throw new Error('Cannot get entity from a channel (or group) ' +
                        'that you are not part of. Join the group and retry',
                    )
                } else if (invite instanceof types.ChatInviteAlready) {
                    return invite.chat
                }
            } else if (username) {
                try {
                    const result = await this.invoke(
                        new functions.contacts.ResolveUsernameRequest(username))
                    const pid = utils.getPeerId(result.peer, false)
                    if (result.peer instanceof types.PeerUser) {
                        for (const x of result.users) {
                            if (x.id === pid) {
                                return x
                            }
                        }
                    } else {
                        for (const x of result.chats) {
                            if (x.id === pid) {
                                return x
                            }
                        }
                    }
                } catch (e) {
                    if (e instanceof errors.UsernameNotOccupiedError) {
                        throw new Error(`No user has "${username}" as username`)
                    }
                    throw e
                }
            }
        }
        throw new Error(`Cannot find any entity corresponding to "${string}"`)
    }

    // endregion


    // users region
    /**
     Turns the given entity into its input entity version.

     Most requests use this kind of :tl:`InputPeer`, so this is the most
     suitable call to make for those cases. **Generally you should let the
     library do its job** and don't worry about getting the input entity
     first, but if you're going to use an entity often, consider making the
     call:

     Arguments
     entity (`str` | `int` | :tl:`Peer` | :tl:`InputPeer`):
     If a username or invite link is given, **the library will
     use the cache**. This means that it's possible to be using
     a username that *changed* or an old invite link (this only
     happens if an invite link for a small group chat is used
     after it was upgraded to a mega-group).

     If the username or ID from the invite link is not found in
     the cache, it will be fetched. The same rules apply to phone
     numbers (``'+34 123456789'``) from people in your contact list.

     If an exact name is given, it must be in the cache too. This
     is not reliable as different people can share the same name
     and which entity is returned is arbitrary, and should be used
     only for quick tests.

     If a positive integer ID is given, the entity will be searched
     in cached users, chats or channels, without making any call.

     If a negative integer ID is given, the entity will be searched
     exactly as either a chat (prefixed with ``-``) or as a channel
     (prefixed with ``-100``).

     If a :tl:`Peer` is given, it will be searched exactly in the
     cache as either a user, chat or channel.

     If the given object can be turned into an input entity directly,
     said operation will be done.

     Unsupported types will raise ``TypeError``.

     If the entity can't be found, ``ValueError`` will be raised.

     Returns
     :tl:`InputPeerUser`, :tl:`InputPeerChat` or :tl:`InputPeerChannel`
     or :tl:`InputPeerSelf` if the parameter is ``'me'`` or ``'self'``.

     If you need to get the ID of yourself, you should use
     `get_me` with ``input_peer=True``) instead.

     Example
     .. code-block:: python

     // If you're going to use "username" often in your code
     // (make a lot of calls), consider getting its input entity
     // once, and then using the "user" everywhere instead.
     user = await client.get_input_entity('username')

     // The same applies to IDs, chats or channels.
     chat = await client.get_input_entity(-123456789)

     * @param peer
     * @returns {Promise<void>}
     */
    async getInputEntity(peer) {
        // Short-circuit if the input parameter directly maps to an InputPeer
        try {
            return utils.getInputPeer(peer)
            // eslint-disable-next-line no-empty
        } catch (e) {
        }
        // Next in priority is having a peer (or its ID) cached in-memory
        try {
            // 0x2d45687 == crc32(b'Peer')
            if (typeof peer === 'number' || peer.SUBCLASS_OF_ID === 0x2d45687) {
                if (this._entityCache.has(peer)) {
                    return this._entityCache[peer]
                }
            }
            // eslint-disable-next-line no-empty
        } catch (e) {
        }
        // Then come known strings that take precedence
        if (['me', 'this'].includes(peer)) {
            return new types.InputPeerSelf()
        }
        // No InputPeer, cached peer, or known string. Fetch from disk cache
        try {
            return this.session.getInputEntity(peer)
            // eslint-disable-next-line no-empty
        } catch (e) {
        }
        // Only network left to try
        if (typeof peer === 'string') {
            return utils.getInputPeer(await this._getEntityFromString(peer))
        }
        // If we're a bot and the user has messaged us privately users.getUsers
        // will work with access_hash = 0. Similar for channels.getChannels.
        // If we're not a bot but the user is in our contacts, it seems to work
        // regardless. These are the only two special-cased requests.
        console.log('the peer i will get is ', peer)
        peer = utils.getPeer(peer)
        console.log('the peer i got was ', peer)
        if (peer instanceof types.PeerUser) {
            const users = await this.invoke(new functions.users.GetUsersRequest({
                id: [new types.InputUser({
                    userId: peer.userId, accessHash: 0,
                })],
            }))
            if (users && !(users[0] instanceof types.UserEmpty)) {
                // If the user passed a valid ID they expect to work for
                // channels but would be valid for users, we get UserEmpty.
                // Avoid returning the invalid empty input peer for that.
                //
                // We *could* try to guess if it's a channel first, and if
                // it's not, work as a chat and try to validate it through
                // another request, but that becomes too much work.
                return utils.getInputPeer(users[0])
            }
        } else if (peer instanceof types.PeerChat) {
            return new types.InputPeerChat({
                chatId: peer.chatId,
            })
        } else if (peer instanceof types.PeerChannel) {
            try {
                const channels = await this.invoke(new functions.channels.GetChannelsRequest({
                    id: [new types.InputChannel({
                        channelId: peer.channelId,
                        accessHash: 0,
                    })],
                }))

                return utils.getInputPeer(channels.chats[0])
                // eslint-disable-next-line no-empty
            } catch (e) {
                console.log(e)
            }
        }
        throw new Error(`Could not find the input entity for ${peer.id || peer.channelId || peer.chatId || peer.userId}.
         Please read https://` +
            'docs.telethon.dev/en/latest/concepts/entities.html to' +
            ' find out more details.',
        )
    }


    // endregion


    async _dispatchUpdate(args = {
        update: null,
        others: null,
        channelId: null,
        ptsDate: null,
    }) {
        console.log('event args are ', args)
        for (const [builder, callback] of this._eventBuilders) {
            const event = builder.build(args.update)
            if (event) {
                await callback(event)
            }
        }
    }

    isConnected() {
        if (this._sender) {
            if (this._sender.isConnected()) {
                return true
            }
        }
        return false

    }

    async signUp() {

    }
}

module.exports = TelegramClient
