const MtProtoPlainSender = require('./MTProtoPlainSender')
const MTProtoState = require('./MTProtoState')
const Helpers = require('../Helpers')
const AuthKey = require('../crypto/AuthKey')
const doAuthentication = require('./Authenticator')
const RPCResult = require('../tl/core/RPCResult')
const MessageContainer = require('../tl/core/MessageContainer')
const GZIPPacked = require('../tl/core/GZIPPacked')
const RequestState = require('./RequestState')
const format = require('string-format')
const { MsgsAck, File, MsgsStateInfo, Pong } = require('../tl/types')
const MessagePacker = require('../extensions/MessagePacker')
const BinaryReader = require('../extensions/BinaryReader')
const {
    BadServerSalt,
    BadMsgNotification,
    MsgDetailedInfo,
    MsgNewDetailedInfo,
    NewSessionCreated,
    FutureSalts,
    MsgsStateReq,
    MsgResendReq,
    MsgsAllInfo,
} = require('../tl/types')
const { SecurityError } = require('../errors/Common')
const { InvalidBufferError } = require('../errors/Common')
const { LogOutRequest } = require('../tl/functions/auth')
const { RPCMessageToError } = require('../errors')
const { TypeNotFoundError } = require('../errors/Common')

// const { tlobjects } = require("../gramjs/tl/alltlobjects");
format.extend(String.prototype, {})

/**
 * MTProto Mobile Protocol sender
 * (https://core.telegram.org/mtproto/description)
 * This class is responsible for wrapping requests into `TLMessage`'s,
 * sending them over the network and receiving them in a safe manner.
 *
 * Automatic reconnection due to temporary network issues is a concern
 * for this class as well, including retry of messages that could not
 * be sent successfully.
 *
 * A new authorization key will be generated on connection if no other
 * key exists yet.
 */
class MTProtoSender {
    static DEFAULT_OPTIONS = {
        logger: null,
        retries: 5,
        delay: 1,
        autoReconnect: true,
        connectTimeout: null,
        authKeyCallback: null,
        updateCallback: null,
        autoReconnectCallback: null,
    }

    /**
     * @param authKey
     * @param opts
     */
    constructor(authKey, opts) {
        const args = { ...MTProtoSender.DEFAULT_OPTIONS, ...opts }
        this._connection = null
        this._log = args.logger
        this._retries = args.retries
        this._delay = args.delay
        this._autoReconnect = args.autoReconnect
        this._connectTimeout = args.connectTimeout
        this._authKeyCallback = args.authKeyCallback
        this._updateCallback = args.updateCallback
        this._autoReconnectCallback = args.autoReconnectCallback

        /**
         * Whether the user has explicitly connected or disconnected.
         *
         * If a disconnection happens for any other reason and it
         * was *not* user action then the pending messages won't
         * be cleared but on explicit user disconnection all the
         * pending futures should be cancelled.
         */
        this._user_connected = false
        this._reconnecting = false
        this._disconnected = true

        /**
         * We need to join the loops upon disconnection
         */
        this._send_loop_handle = null
        this._recv_loop_handle = null

        /**
         * Preserving the references of the AuthKey and state is important
         */
        this.authKey = authKey || new AuthKey(null)
        this._state = new MTProtoState(this.authKey, this._log)

        /**
         * Outgoing messages are put in a queue and sent in a batch.
         * Note that here we're also storing their ``_RequestState``.
         */
        this._send_queue = new MessagePacker(this._state, this._log)

        /**
         * Sent states are remembered until a response is received.
         */
        this._pending_state = {}

        /**
         * Responses must be acknowledged, and we can also batch these.
         */
        this._pending_ack = new Set()

        /**
         * Similar to pending_messages but only for the last acknowledges.
         * These can't go in pending_messages because no acknowledge for them
         * is received, but we may still need to resend their state on bad salts.
         */
        this._last_acks = []

        /**
         * Jump table from response ID to method that handles it
         */

        this._handlers = {
            [RPCResult.CONSTRUCTOR_ID]: this._handleRPCResult.bind(this),
            [MessageContainer.CONSTRUCTOR_ID]: this._handleContainer.bind(this),
            [GZIPPacked.CONSTRUCTOR_ID]: this._handleGzipPacked.bind(this),
            [Pong.CONSTRUCTOR_ID]: this._handlePong.bind(this),
            [BadServerSalt.CONSTRUCTOR_ID]: this._handleBadServerSalt.bind(this),
            [BadMsgNotification.CONSTRUCTOR_ID]: this._handleBadNotification.bind(this),
            [MsgDetailedInfo.CONSTRUCTOR_ID]: this._handleDetailedInfo.bind(this),
            [MsgNewDetailedInfo.CONSTRUCTOR_ID]: this._handleNewDetailedInfo.bind(this),
            [NewSessionCreated.CONSTRUCTOR_ID]: this._handleNewSessionCreated.bind(this),
            [MsgsAck.CONSTRUCTOR_ID]: this._handleAck.bind(this),
            [FutureSalts.CONSTRUCTOR_ID]: this._handleFutureSalts.bind(this),
            [MsgsStateReq.CONSTRUCTOR_ID]: this._handleStateForgotten.bind(this),
            [MsgResendReq.CONSTRUCTOR_ID]: this._handleStateForgotten.bind(this),
            [MsgsAllInfo.CONSTRUCTOR_ID]: this._handleMsgAll.bind(this),
        }
    }

    // Public API

    /**
     * Connects to the specified given connection using the given auth key.
     * @param connection
     * @returns {Promise<boolean>}
     */
    async connect(connection) {
        if (this._user_connected) {
            this._log.info('User is already connected!')
            return false
        }
        this._connection = connection
        await this._connect()
        return true
    }

    isConnected() {
        return this._user_connected
    }

    /**
     * Cleanly disconnects the instance from the network, cancels
     * all pending requests, and closes the send and receive loops.
     */
    async disconnect() {
        await this._disconnect()
    }

    /**
     *
     This method enqueues the given request to be sent. Its send
     state will be saved until a response arrives, and a ``Future``
     that will be resolved when the response arrives will be returned:

     .. code-block:: javascript

     async def method():
     # Sending (enqueued for the send loop)
     future = sender.send(request)
     # Receiving (waits for the receive loop to read the result)
     result = await future

     Designed like this because Telegram may send the response at
     any point, and it can send other items while one waits for it.
     Once the response for this future arrives, it is set with the
     received result, quite similar to how a ``receive()`` call
     would otherwise work.

     Since the receiving part is "built in" the future, it's
     impossible to await receive a result that was never sent.
     * @param request
     * @returns {RequestState}
     */
    send(request) {
        if (!this._user_connected) {
            throw new Error('Cannot send requests while disconnected')
        }

        if (!Helpers.isArrayLike(request)) {
            const state = new RequestState(request)
            this._send_queue.append(state)
            return state.promise
        } else {
            throw new Error('not supported')
        }
    }

    /**
     * Performs the actual connection, retrying, generating the
     * authorization key if necessary, and starting the send and
     * receive loops.
     * @returns {Promise<void>}
     * @private
     */
    async _connect() {

        this._log.info('Connecting to {0}...'.replace('{0}', this._connection))
        await this._connection.connect()
        this._log.debug('Connection success!')
        if (!this.authKey._key) {
            const plain = new MtProtoPlainSender(this._connection, this._log)
            this._log.debug('New auth_key attempt ...')
            const res = await doAuthentication(plain, this._log)
            this._log.debug('Generated new auth_key successfully')
            this.authKey.key = res.authKey
            this._state.time_offset = res.timeOffset

            /**
             * This is *EXTREMELY* important since we don't control
             * external references to the authorization key, we must
             * notify whenever we change it. This is crucial when we
             * switch to different data centers.
             */
            if (this._authKeyCallback) {
                this._authKeyCallback(this.authKey)
            }
        } else {
            this._log.debug('Already have an auth key ...')
        }
        this._user_connected = true

        this._log.debug('Starting send loop')
        this._send_loop_handle = this._sendLoop()

        this._log.debug('Starting receive loop')
        this._recv_loop_handle = this._recvLoop()

        // _disconnected only completes after manual disconnection
        // or errors after which the sender cannot continue such
        // as failing to reconnect or any unexpected error.

        this._log.info('Connection to %s complete!'.replace('%s', this._connection.toString()))
    }

    async _disconnect(error = null) {
        if (this._connection === null) {
            this._log.info('Not disconnecting (already have no connection)')
            return
        }
        this._log.info('Disconnecting from %s...'.replace('%s', this._connection.toString()))
        this._user_connected = false
        this._log.debug('Closing current connection...')
        await this._connection.disconnect()
    }

    /**
     * This loop is responsible for popping items off the send
     * queue, encrypting them, and sending them over the network.
     * Besides `connect`, only this method ever sends data.
     * @returns {Promise<void>}
     * @private
     */
    async _sendLoop() {
        while (this._user_connected && !this._reconnecting) {
            if (this._pending_ack.size) {
                const ack = new RequestState(new MsgsAck({ msgIds: Array(...this._pending_ack) }))
                this._send_queue.append(ack)
                this._last_acks.push(ack)
                this._pending_ack.clear()
            }
            // this._log.debug('Waiting for messages to send...');
            this._log.debug('Waiting for messages to send...')
            // TODO Wait for the connection send queue to be empty?
            // This means that while it's not empty we can wait for
            // more messages to be added to the send queue.
            const res = await this._send_queue.get()
            if (!res) {
                continue
            }
            let data = res.data
            const batch = res.batch
            this._log.debug(`Encrypting ${batch.length} message(s) in ${data.length} bytes for sending`)

            data = this._state.encryptMessageData(data)

            try {
                await this._connection.send(data)
            } catch (e) {
                console.log(e)
                this._log.info('Connection closed while sending data')
                return
            }
            for (const state of batch) {
                this._pending_state[state.msgId] = state
            }
            this._log.debug('Encrypted messages put in a queue to be sent')
        }
    }

    async _recvLoop() {
        let body
        let message

        while (this._user_connected && !this._reconnecting) {
            // this._log.debug('Receiving items from the network...');
            this._log.debug('Receiving items from the network...')
            try {
                body = await this._connection.recv()
            } catch (e) {
                // this._log.info('Connection closed while receiving data');
                this._log.warn('Connection closed while receiving data')
                return
            }
            try {
                message = await this._state.decryptMessageData(body)
            } catch (e) {
                console.log(e)

                if (e instanceof TypeNotFoundError) {
                    // Received object which we don't know how to deserialize
                    this._log.info(`Type ${e.invalidConstructorId} not found, remaining data ${e.remaining}`)
                    continue
                } else if (e instanceof SecurityError) {
                    // A step while decoding had the incorrect data. This message
                    // should not be considered safe and it should be ignored.
                    this._log.warn(`Security error while unpacking a received message: ${e}`)
                    continue
                } else if (e instanceof InvalidBufferError) {
                    this._log.info('Broken authorization key; resetting')
                    this.authKey.key = null
                    if (this._authKeyCallback) {
                        this._authKeyCallback(null)
                    }
                    this._startReconnect(e)

                    return
                } else {
                    this._log.error('Unhandled error while receiving data')
                    return
                }
            }
            try {
                await this._processMessage(message)
            } catch (e) {
                console.log(e)
                this._log.error('Unhandled error while receiving data')
            }
        }
    }

    // Response Handlers

    /**
     * Adds the given message to the list of messages that must be
     * acknowledged and dispatches control to different ``_handle_*``
     * method based on its type.
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _processMessage(message) {
        this._pending_ack.add(message.msgId)
        // eslint-disable-next-line require-atomic-updates
        message.obj = await message.obj
        let handler = this._handlers[message.obj.CONSTRUCTOR_ID]
        if (!handler) {
            handler = this._handleUpdate.bind(this)
        }

        await handler(message)
    }

    /**
     * Pops the states known to match the given ID from pending messages.
     * This method should be used when the response isn't specific.
     * @param msgId
     * @returns {*[]}
     * @private
     */
    _popStates(msgId) {
        let state = this._pending_state[msgId]
        if (state) {
            delete this._pending_state[msgId]
            return [state]
        }

        const toPop = []

        for (state in this._pending_state) {
            if (state.containerId === msgId) {
                toPop.push(state.msgId)
            }
        }

        if (toPop.length) {
            const temp = []
            for (const x of toPop) {
                temp.push(this._pending_state[x])
                delete this._pending_state[x]
            }
            return temp
        }

        for (const ack of this._last_acks) {
            if (ack.msgId === msgId) {
                return [ack]
            }
        }

        return []
    }

    /**
     * Handles the result for Remote Procedure Calls:
     * rpc_result#f35c6d01 req_msg_id:long result:bytes = RpcResult;
     * This is where the future results for sent requests are set.
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleRPCResult(message) {
        const RPCResult = message.obj
        const state = this._pending_state[RPCResult.reqMsgId]
        if (state) {
            delete this._pending_state[RPCResult.reqMsgId]
        }
        this._log.debug(`Handling RPC result for message ${RPCResult.reqMsgId}`)

        if (!state) {
            // TODO We should not get responses to things we never sent
            // However receiving a File() with empty bytes is "common".
            // See #658, #759 and #958. They seem to happen in a container
            // which contain the real response right after.
            try {
                const reader = new BinaryReader(RPCResult.body)
                if (!(reader.tgReadObject() instanceof File)) {
                    throw new TypeNotFoundError('Not an upload.File')
                }
            } catch (e) {
                console.log(e)
                if (e instanceof TypeNotFoundError) {
                    this._log.info(`Received response without parent request: ${RPCResult.body}`)
                    return
                } else {
                    throw e
                }
            }
        }
        if (RPCResult.error) {
            // eslint-disable-next-line new-cap
            const error = RPCMessageToError(RPCResult.error, state.request)
            this._send_queue.append(new RequestState(new MsgsAck({ msgIds: [state.msgId] })))
            state.reject(error)
        } else {
            const reader = new BinaryReader(RPCResult.body)
            const read = await state.request.readResult(reader)
            state.resolve(read)
        }
    }

    /**
     * Processes the inner messages of a container with many of them:
     * msg_container#73f1f8dc messages:vector<%Message> = MessageContainer;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleContainer(message) {
        this._log.debug('Handling container')
        for (const innerMessage of message.obj.messages) {
            await this._processMessage(innerMessage)
        }
    }

    /**
     * Unpacks the data from a gzipped object and processes it:
     * gzip_packed#3072cfa1 packed_data:bytes = Object;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleGzipPacked(message) {
        this._log.debug('Handling gzipped data')
        const reader = new BinaryReader(message.obj.data)
        message.obj = reader.tgReadObject()
        await this._processMessage(message)
    }

    async _handleUpdate(message) {
        if (message.obj.SUBCLASS_OF_ID !== 0x8af52aac) {
            // crc32(b'Updates')
            logger.warn(`Note: ${message.obj.constructor.name} is not an update, not dispatching it`)
            return
        }
        this._log.debug('Handling update %s', message.obj.constructor.name)
        if (this._updateCallback) {
            this._updateCallback(message.obj)
        }
    }

    /**
     * Handles pong results, which don't come inside a ``RPCResult``
     * but are still sent through a request:
     * pong#347773c5 msg_id:long ping_id:long = Pong;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handlePong(message) {
        const pong = message.obj
        this._log.debug(`Handling pong for message ${pong.msgId}`)
        const state = this._pending_state[pong.msgId]
        delete this._pending_state[pong.msgId]

        // Todo Check result
        if (state) {
            state.resolve(pong)
        }
    }

    /**
     * Corrects the currently used server salt to use the right value
     * before enqueuing the rejected message to be re-sent:
     * bad_server_salt#edab447b bad_msg_id:long bad_msg_seqno:int
     * error_code:int new_server_salt:long = BadMsgNotification;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleBadServerSalt(message) {
        const badSalt = message.obj
        this._log.debug(`Handling bad salt for message ${badSalt.badMsgId}`)
        this._state.salt = badSalt.newServerSalt
        const states = this._popStates(badSalt.badMsgId)
        this._send_queue.extend(states)
        this._log.debug(`${states.length} message(s) will be resent`)
    }

    /**
     * Adjusts the current state to be correct based on the
     * received bad message notification whenever possible:
     * bad_msg_notification#a7eff811 bad_msg_id:long bad_msg_seqno:int
     * error_code:int = BadMsgNotification;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleBadNotification(message) {
        const badMsg = message.obj
        const states = this._popStates(badMsg.badMsgId)
        this._log.debug(`Handling bad msg ${badMsg}`)
        if ([16, 17].contains(badMsg.errorCode)) {
            // Sent msg_id too low or too high (respectively).
            // Use the current msg_id to determine the right time offset.
            const to = this._state.updateTimeOffset(message.msgId)
            this._log.info(`System clock is wrong, set time offset to ${to}s`)
        } else if (badMsg.errorCode === 32) {
            // msg_seqno too low, so just pump it up by some "large" amount
            // TODO A better fix would be to start with a new fresh session ID
            this._state._sequence += 64
        } else if (badMsg.errorCode === 33) {
            // msg_seqno too high never seems to happen but just in case
            this._state._sequence -= 16
        } else {
            // for (const state of states) {
            // TODO set errors;
            /* state.future.set_exception(
            BadMessageError(state.request, bad_msg.error_code))*/
            // }

            return
        }
        // Messages are to be re-sent once we've corrected the issue
        this._send_queue.extend(states)
        this._log.debug(`${states.length} messages will be resent due to bad msg`)
    }

    /**
     * Updates the current status with the received detailed information:
     * msg_detailed_info#276d3ec6 msg_id:long answer_msg_id:long
     * bytes:int status:int = MsgDetailedInfo;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleDetailedInfo(message) {
        // TODO https://goo.gl/VvpCC6
        const msgId = message.obj.answerMsgId
        this._log.debug(`Handling detailed info for message ${msgId}`)
        this._pending_ack.add(msgId)
    }

    /**
     * Updates the current status with the received detailed information:
     * msg_new_detailed_info#809db6df answer_msg_id:long
     * bytes:int status:int = MsgDetailedInfo;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleNewDetailedInfo(message) {
        // TODO https://goo.gl/VvpCC6
        const msgId = message.obj.answerMsgId
        this._log.debug(`Handling new detailed info for message ${msgId}`)
        this._pending_ack.add(msgId)
    }

    /**
     * Updates the current status with the received session information:
     * new_session_created#9ec20908 first_msg_id:long unique_id:long
     * server_salt:long = NewSession;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleNewSessionCreated(message) {
        // TODO https://goo.gl/LMyN7A
        this._log.debug('Handling new session created')
        this._state.salt = message.obj.serverSalt
    }

    /**
     * Handles a server acknowledge about our messages. Normally
     * these can be ignored except in the case of ``auth.logOut``:
     *
     *     auth.logOut#5717da40 = Bool;
     *
     * Telegram doesn't seem to send its result so we need to confirm
     * it manually. No other request is known to have this behaviour.

     * Since the ID of sent messages consisting of a container is
     * never returned (unless on a bad notification), this method
     * also removes containers messages when any of their inner
     * messages are acknowledged.

     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleAck(message) {
        const ack = message.obj
        this._log.debug(`Handling acknowledge for ${ack.msgIds}`)
        for (const msgId of ack.msgIds) {
            const state = this._pending_state[msgId]
            if (state && state.request instanceof LogOutRequest) {
                delete this._pending_state[msgId]
                state.resolve(true)
            }
        }
    }

    /**
     * Handles future salt results, which don't come inside a
     * ``rpc_result`` but are still sent through a request:
     *     future_salts#ae500895 req_msg_id:long now:int
     *     salts:vector<future_salt> = FutureSalts;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleFutureSalts(message) {
        // TODO save these salts and automatically adjust to the
        // correct one whenever the salt in use expires.
        this._log.debug(`Handling future salts for message ${message.msgId}`)
        const state = this._pending_state[message.msgId]

        if (state) {
            delete this._pending_state[message]
            state.resolve(message.obj)
        }
    }

    /**
     * Handles both :tl:`MsgsStateReq` and :tl:`MsgResendReq` by
     * enqueuing a :tl:`MsgsStateInfo` to be sent at a later point.
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleStateForgotten(message) {
        this._send_queue.append(
            new RequestState(new MsgsStateInfo(message.msgId, String.fromCharCode(1).repeat(message.obj.msgIds))),
        )
    }

    /**
     * Handles :tl:`MsgsAllInfo` by doing nothing (yet).
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleMsgAll(message) {
    }

    _startReconnect(e) {
        if (this._user_connected && !this._reconnecting) {
            this._reconnecting = true
            this._reconnect(e)
        }
    }

    async _reconnect(e) {
        this._log.debug('Closing current connection...')
        await this._connection.disconnect()
        this._reconnecting = false
        this._state.reset()
        const retries = this._retries
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                await this._connect()
                this._send_queue.extend(Object.values(this._pending_state))
                this._pending_state = {}
                if (this._autoReconnectCallback) {
                    this._autoReconnectCallback()
                }
                break
            } catch (e) {
                this._log.error(e)
                await Helpers.sleep(this._delay)
            }
        }
    }
}

module.exports = MTProtoSender
