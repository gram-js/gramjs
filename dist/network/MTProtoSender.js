"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTProtoSender = void 0;
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
const AuthKey_1 = require("../crypto/AuthKey");
const MTProtoState_1 = require("./MTProtoState");
const extensions_1 = require("../extensions");
const core_1 = require("../tl/core");
const tl_1 = require("../tl");
const big_integer_1 = __importDefault(require("big-integer"));
const Helpers_1 = require("../Helpers");
const RequestState_1 = require("./RequestState");
const Authenticator_1 = require("./Authenticator");
const MTProtoPlainSender_1 = require("./MTProtoPlainSender");
const errors_1 = require("../errors");
const _1 = require("./");
const Logger_1 = require("../extensions/Logger");
const async_mutex_1 = require("async-mutex");
const PendingState_1 = require("../extensions/PendingState");
var MsgsAck = tl_1.Api.MsgsAck;
class MTProtoSender {
    /**
     * @param authKey
     * @param opts
     */
    constructor(authKey, opts) {
        const args = Object.assign(Object.assign({}, MTProtoSender.DEFAULT_OPTIONS), opts);
        this._finishedConnecting = false;
        this._cancelSend = false;
        this._connection = undefined;
        this._log = args.logger;
        this._dcId = args.dcId;
        this._retries = args.retries;
        this._delay = args.delay;
        this._autoReconnect = args.autoReconnect;
        this._connectTimeout = args.connectTimeout;
        this._authKeyCallback = args.authKeyCallback;
        this._updateCallback = args.updateCallback;
        this._autoReconnectCallback = args.autoReconnectCallback;
        this._isMainSender = args.isMainSender;
        this._senderCallback = args.senderCallback;
        this._client = args.client;
        this._onConnectionBreak = args.onConnectionBreak;
        this._securityChecks = args.securityChecks;
        this._connectMutex = new async_mutex_1.Mutex();
        /**
         * whether we disconnected ourself or telegram did it.
         */
        this.userDisconnected = false;
        /**
         * If a disconnection happens for any other reason and it
         * was *not* user action then the pending messages won't
         * be cleared but on explicit user disconnection all the
         * pending futures should be cancelled.
         */
        this.isConnecting = false;
        this._authenticated = false;
        this._userConnected = false;
        this.isReconnecting = false;
        this._reconnecting = false;
        this._disconnected = true;
        /**
         * We need to join the loops upon disconnection
         */
        this._sendLoopHandle = null;
        this._recvLoopHandle = null;
        /**
         * Preserving the references of the AuthKey and state is important
         */
        this.authKey = authKey || new AuthKey_1.AuthKey();
        this._state = new MTProtoState_1.MTProtoState(this.authKey, this._log, this._securityChecks);
        /**
         * Outgoing messages are put in a queue and sent in a batch.
         * Note that here we're also storing their ``_RequestState``.
         */
        this._sendQueue = new extensions_1.MessagePacker(this._state, this._log);
        /**
         * Sent states are remembered until a response is received.
         */
        this._pendingState = new PendingState_1.PendingState();
        /**
         * Responses must be acknowledged, and we can also batch these.
         */
        this._pendingAck = new Set();
        /**
         * Similar to pending_messages but only for the last acknowledges.
         * These can't go in pending_messages because no acknowledge for them
         * is received, but we may still need to resend their state on bad salts.
         */
        this._lastAcks = [];
        /**
         * Jump table from response ID to method that handles it
         */
        this._handlers = {
            [core_1.RPCResult.CONSTRUCTOR_ID.toString()]: this._handleRPCResult.bind(this),
            [core_1.MessageContainer.CONSTRUCTOR_ID.toString()]: this._handleContainer.bind(this),
            [core_1.GZIPPacked.CONSTRUCTOR_ID.toString()]: this._handleGzipPacked.bind(this),
            [tl_1.Api.Pong.CONSTRUCTOR_ID.toString()]: this._handlePong.bind(this),
            [tl_1.Api.BadServerSalt.CONSTRUCTOR_ID.toString()]: this._handleBadServerSalt.bind(this),
            [tl_1.Api.BadMsgNotification.CONSTRUCTOR_ID.toString()]: this._handleBadNotification.bind(this),
            [tl_1.Api.MsgDetailedInfo.CONSTRUCTOR_ID.toString()]: this._handleDetailedInfo.bind(this),
            [tl_1.Api.MsgNewDetailedInfo.CONSTRUCTOR_ID.toString()]: this._handleNewDetailedInfo.bind(this),
            [tl_1.Api.NewSessionCreated.CONSTRUCTOR_ID.toString()]: this._handleNewSessionCreated.bind(this),
            [tl_1.Api.MsgsAck.CONSTRUCTOR_ID.toString()]: this._handleAck.bind(this),
            [tl_1.Api.FutureSalts.CONSTRUCTOR_ID.toString()]: this._handleFutureSalts.bind(this),
            [tl_1.Api.MsgsStateReq.CONSTRUCTOR_ID.toString()]: this._handleStateForgotten.bind(this),
            [tl_1.Api.MsgResendReq.CONSTRUCTOR_ID.toString()]: this._handleStateForgotten.bind(this),
            [tl_1.Api.MsgsAllInfo.CONSTRUCTOR_ID.toString()]: this._handleMsgAll.bind(this),
        };
    }
    set dcId(dcId) {
        this._dcId = dcId;
    }
    get dcId() {
        return this._dcId;
    }
    // Public API
    /**
     * Connects to the specified given connection using the given auth key.
     */
    async connect(connection, force) {
        this.userDisconnected = false;
        if (this._userConnected && !force) {
            this._log.info("User is already connected!");
            return false;
        }
        this.isConnecting = true;
        this._connection = connection;
        this._finishedConnecting = false;
        for (let attempt = 0; attempt < this._retries; attempt++) {
            try {
                await this._connect();
                if (this._updateCallback) {
                    this._updateCallback(this._client, new _1.UpdateConnectionState(_1.UpdateConnectionState.connected));
                }
                this._finishedConnecting = true;
                break;
            }
            catch (err) {
                if (this._updateCallback && attempt === 0) {
                    this._updateCallback(this._client, new _1.UpdateConnectionState(_1.UpdateConnectionState.disconnected));
                }
                this._log.error(`WebSocket connection failed attempt: ${attempt + 1}`);
                if (this._client._errorHandler) {
                    await this._client._errorHandler(err);
                }
                if (this._log.canSend(Logger_1.LogLevel.ERROR)) {
                    console.error(err);
                }
                await (0, Helpers_1.sleep)(this._delay);
            }
        }
        this.isConnecting = false;
        return this._finishedConnecting;
    }
    isConnected() {
        return this._userConnected;
    }
    _transportConnected() {
        return (!this._reconnecting &&
            this._connection &&
            this._connection._connected);
    }
    /**
     * Cleanly disconnects the instance from the network, cancels
     * all pending requests, and closes the send and receive loops.
     */
    async disconnect() {
        this.userDisconnected = true;
        this._log.warn("Disconnecting...");
        await this._disconnect();
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
        const state = new RequestState_1.RequestState(request);
        this._log.debug(`Send ${request.className}`);
        this._sendQueue.append(state);
        return state.promise;
    }
    addStateToQueue(state) {
        this._sendQueue.append(state);
    }
    /**
     * Performs the actual connection, retrying, generating the
     * authorization key if necessary, and starting the send and
     * receive loops.
     * @returns {Promise<void>}
     * @private
     */
    async _connect() {
        const connection = this._connection;
        if (!connection.isConnected()) {
            this._log.info("Connecting to {0}...".replace("{0}", connection.toString()));
            await connection.connect();
            this._log.debug("Connection success!");
        }
        if (!this.authKey.getKey()) {
            const plain = new MTProtoPlainSender_1.MTProtoPlainSender(connection, this._log);
            this._log.debug("New auth_key attempt ...");
            const res = await (0, Authenticator_1.doAuthentication)(plain, this._log);
            this._log.debug("Generated new auth_key successfully");
            await this.authKey.setKey(res.authKey);
            this._state.timeOffset = res.timeOffset;
            if (this._authKeyCallback) {
                await this._authKeyCallback(this.authKey, this._dcId);
            }
        }
        else {
            this._authenticated = true;
            this._log.debug("Already have an auth key ...");
        }
        this._userConnected = true;
        this.isReconnecting = false;
        if (!this._sendLoopHandle) {
            this._log.debug("Starting send loop");
            this._sendLoopHandle = this._sendLoop();
        }
        if (!this._recvLoopHandle) {
            this._log.debug("Starting receive loop");
            this._recvLoopHandle = this._recvLoop();
        }
        // _disconnected only completes after manual disconnection
        // or errors after which the sender cannot continue such
        // as failing to reconnect or any unexpected error.
        this._log.info("Connection to %s complete!".replace("%s", connection.toString()));
    }
    async _disconnect() {
        const connection = this._connection;
        if (this._updateCallback) {
            this._updateCallback(this._client, new _1.UpdateConnectionState(_1.UpdateConnectionState.disconnected));
        }
        if (connection === undefined) {
            this._log.info("Not disconnecting (already have no connection)");
            return;
        }
        this._log.info("Disconnecting from %s...".replace("%s", connection.toString()));
        this._userConnected = false;
        this._log.debug("Closing current connection...");
        await connection.disconnect();
    }
    _cancelLoops() {
        this._cancelSend = true;
        this.cancellableRecvLoopPromise.cancel();
    }
    /**
     * This loop is responsible for popping items off the send
     * queue, encrypting them, and sending them over the network.
     * Besides `connect`, only this method ever sends data.
     * @returns {Promise<void>}
     * @private
     */
    async _sendLoop() {
        // Retry previous pending requests
        this._sendQueue.prepend(this._pendingState.values());
        this._pendingState.clear();
        while (this._userConnected && !this.isReconnecting) {
            const appendAcks = () => {
                if (this._pendingAck.size) {
                    const ack = new RequestState_1.RequestState(new MsgsAck({ msgIds: Array(...this._pendingAck) }));
                    this._sendQueue.append(ack);
                    this._lastAcks.push(ack);
                    if (this._lastAcks.length >= 10) {
                        this._lastAcks.shift();
                    }
                    this._pendingAck.clear();
                }
            };
            appendAcks();
            this._log.debug(`Waiting for messages to send... ${this.isReconnecting}`);
            // TODO Wait for the connection send queue to be empty?
            // This means that while it's not empty we can wait for
            // more messages to be added to the send queue.
            await this._sendQueue.wait();
            // If we've had new ACKs appended while waiting for messages to send, add them to queue
            appendAcks();
            const res = await this._sendQueue.get();
            this._log.debug(`Got ${res === null || res === void 0 ? void 0 : res.batch.length} message(s) to send`);
            if (this.isReconnecting) {
                this._log.debug("Reconnecting");
                this._sendLoopHandle = undefined;
                return;
            }
            if (!res) {
                continue;
            }
            let { data } = res;
            const { batch } = res;
            this._log.debug(`Encrypting ${batch.length} message(s) in ${data.length} bytes for sending`);
            this._log.debug(`Sending   ${batch.map((m) => m.request.className)}`);
            data = await this._state.encryptMessageData(data);
            try {
                await this._connection.send(data);
            }
            catch (e) {
                this._log.debug(`Connection closed while sending data ${e}`);
                if (this._log.canSend(Logger_1.LogLevel.DEBUG)) {
                    console.error(e);
                }
                this._sendLoopHandle = undefined;
                return;
            }
            for (const state of batch) {
                if (!Array.isArray(state)) {
                    if (state.request.classType === "request") {
                        this._pendingState.set(state.msgId, state);
                    }
                }
                else {
                    for (const s of state) {
                        if (s.request.classType === "request") {
                            this._pendingState.set(s.msgId, s);
                        }
                    }
                }
            }
            this._log.debug("Encrypted messages put in a queue to be sent");
        }
        this._sendLoopHandle = undefined;
    }
    async _recvLoop() {
        let body;
        let message;
        while (this._userConnected && !this.isReconnecting) {
            this._log.debug("Receiving items from the network...");
            try {
                body = await this._connection.recv();
            }
            catch (e) {
                /** when the server disconnects us we want to reconnect */
                if (!this.userDisconnected) {
                    this._log.warn("Connection closed while receiving data");
                    if (this._log.canSend(Logger_1.LogLevel.WARN)) {
                        console.error(e);
                    }
                    this.reconnect();
                }
                this._recvLoopHandle = undefined;
                return;
            }
            try {
                message = await this._state.decryptMessageData(body);
            }
            catch (e) {
                this._log.debug(`Error while receiving items from the network ${e}`);
                if (e instanceof errors_1.TypeNotFoundError) {
                    // Received object which we don't know how to deserialize
                    this._log.info(`Type ${e.invalidConstructorId} not found, remaining data ${e.remaining}`);
                    continue;
                }
                else if (e instanceof errors_1.SecurityError) {
                    // A step while decoding had the incorrect data. This message
                    // should not be considered safe and it should be ignored.
                    this._log.warn(`Security error while unpacking a received message: ${e}`);
                    continue;
                }
                else if (e instanceof errors_1.InvalidBufferError) {
                    // 404 means that the server has "forgotten" our auth key and we need to create a new one.
                    if (e.code === 404) {
                        this._handleBadAuthKey();
                    }
                    else {
                        // this happens sometimes when telegram is having some internal issues.
                        // reconnecting should be enough usually
                        // since the data we sent and received is probably wrong now.
                        this._log.warn(`Invalid buffer ${e.code} for dc ${this._dcId}`);
                        this.reconnect();
                    }
                    this._recvLoopHandle = undefined;
                    return;
                }
                else {
                    this._log.error("Unhandled error while receiving data");
                    if (this._client._errorHandler) {
                        await this._client._errorHandler(e);
                    }
                    if (this._log.canSend(Logger_1.LogLevel.ERROR)) {
                        console.log(e);
                    }
                    this.reconnect();
                    this._recvLoopHandle = undefined;
                    return;
                }
            }
            try {
                await this._processMessage(message);
            }
            catch (e) {
                // `RPCError` errors except for 'AUTH_KEY_UNREGISTERED' should be handled by the client
                if (e instanceof errors_1.RPCError) {
                    if (e.message === "AUTH_KEY_UNREGISTERED" ||
                        e.message === "SESSION_REVOKED") {
                        // 'AUTH_KEY_UNREGISTERED' for the main sender is thrown when unauthorized and should be ignored
                        this._handleBadAuthKey(true);
                    }
                }
                else {
                    this._log.error("Unhandled error while receiving data");
                    if (this._client._errorHandler) {
                        await this._client._errorHandler(e);
                    }
                    if (this._log.canSend(Logger_1.LogLevel.ERROR)) {
                        console.log(e);
                    }
                }
            }
        }
        this._recvLoopHandle = undefined;
    }
    // Response Handlers
    _handleBadAuthKey(shouldSkipForMain = false) {
        if (shouldSkipForMain && this._isMainSender) {
            return;
        }
        this._log.warn(`Broken authorization key for dc ${this._dcId}, resetting...`);
        if (this._isMainSender && this._updateCallback) {
            this._updateCallback(this._client, new _1.UpdateConnectionState(_1.UpdateConnectionState.broken));
        }
        else if (!this._isMainSender && this._onConnectionBreak) {
            this._onConnectionBreak(this._dcId);
        }
    }
    /**
     * Adds the given message to the list of messages that must be
     * acknowledged and dispatches control to different ``_handle_*``
     * method based on its type.
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _processMessage(message) {
        this._pendingAck.add(message.msgId);
        message.obj = await message.obj;
        let handler = this._handlers[message.obj.CONSTRUCTOR_ID.toString()];
        if (!handler) {
            handler = this._handleUpdate.bind(this);
        }
        await handler(message);
    }
    /**
     * Pops the states known to match the given ID from pending messages.
     * This method should be used when the response isn't specific.
     * @param msgId
     * @returns {*[]}
     * @private
     */
    _popStates(msgId) {
        var _a;
        const state = this._pendingState.getAndDelete(msgId);
        if (state) {
            return [state];
        }
        const toPop = [];
        for (const pendingState of this._pendingState.values()) {
            if ((_a = pendingState.containerId) === null || _a === void 0 ? void 0 : _a.equals(msgId)) {
                toPop.push(pendingState.msgId);
            }
        }
        if (toPop.length) {
            const temp = [];
            for (const x of toPop) {
                temp.push(this._pendingState.getAndDelete(x));
            }
            return temp;
        }
        for (const ack of this._lastAcks) {
            if (ack.msgId === msgId) {
                return [ack];
            }
        }
        return [];
    }
    /**
     * Handles the result for Remote Procedure Calls:
     * rpc_result#f35c6d01 req_msg_id:long result:bytes = RpcResult;
     * This is where the future results for sent requests are set.
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleRPCResult(message) {
        var _a;
        const result = message.obj;
        const state = this._pendingState.getAndDelete(result.reqMsgId);
        this._log.debug(`Handling RPC result for message ${result.reqMsgId}`);
        if (!state) {
            // TODO We should not get responses to things we never sent
            // However receiving a File() with empty bytes is "common".
            // See #658, #759 and #958. They seem to happen in a container
            // which contain the real response right after.
            try {
                const reader = new extensions_1.BinaryReader(result.body);
                if (!(reader.tgReadObject() instanceof tl_1.Api.upload.File)) {
                    throw new errors_1.TypeNotFoundError(0, Buffer.alloc(0));
                }
            }
            catch (e) {
                if (e instanceof errors_1.TypeNotFoundError) {
                    this._log.info(`Received response without parent request: ${result.body}`);
                    return;
                }
                throw e;
            }
            return;
        }
        if (result.error) {
            // eslint-disable-next-line new-cap
            const error = (0, errors_1.RPCMessageToError)(result.error, state.request);
            this._sendQueue.append(new RequestState_1.RequestState(new MsgsAck({ msgIds: [state.msgId] })));
            state.reject(error);
            throw error;
        }
        else {
            try {
                const reader = new extensions_1.BinaryReader(result.body);
                const read = state.request.readResult(reader);
                this._log.debug(`Handling RPC result ${(_a = read === null || read === void 0 ? void 0 : read.constructor) === null || _a === void 0 ? void 0 : _a.name}`);
                state.resolve(read);
            }
            catch (err) {
                state.reject(err);
                throw err;
            }
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
        this._log.debug("Handling container");
        for (const innerMessage of message.obj.messages) {
            await this._processMessage(innerMessage);
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
        this._log.debug("Handling gzipped data");
        const reader = new extensions_1.BinaryReader(message.obj.data);
        message.obj = reader.tgReadObject();
        await this._processMessage(message);
    }
    async _handleUpdate(message) {
        if (message.obj.SUBCLASS_OF_ID !== 0x8af52aac) {
            // crc32(b'Updates')
            this._log.warn(`Note: ${message.obj.className} is not an update, not dispatching it`);
            return;
        }
        this._log.debug("Handling update " + message.obj.className);
        if (this._updateCallback) {
            this._updateCallback(this._client, message.obj);
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
        const pong = message.obj;
        this._log.debug(`Handling pong for message ${pong.msgId}`);
        const state = this._pendingState.get(pong.msgId.toString());
        this._pendingState.delete(pong.msgId.toString());
        // Todo Check result
        if (state) {
            state.resolve(pong);
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
        const badSalt = message.obj;
        this._log.debug(`Handling bad salt for message ${badSalt.badMsgId}`);
        this._state.salt = badSalt.newServerSalt;
        const states = this._popStates(badSalt.badMsgId);
        this._sendQueue.extend(states);
        this._log.debug(`${states.length} message(s) will be resent`);
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
        const badMsg = message.obj;
        const states = this._popStates(badMsg.badMsgId);
        this._log.debug(`Handling bad msg ${JSON.stringify(badMsg)}`);
        if ([16, 17].includes(badMsg.errorCode)) {
            // Sent msg_id too low or too high (respectively).
            // Use the current msg_id to determine the right time offset.
            const to = this._state.updateTimeOffset((0, big_integer_1.default)(message.msgId));
            this._log.info(`System clock is wrong, set time offset to ${to}s`);
        }
        else if (badMsg.errorCode === 32) {
            // msg_seqno too low, so just pump it up by some "large" amount
            // TODO A better fix would be to start with a new fresh session ID
            this._state._sequence += 64;
        }
        else if (badMsg.errorCode === 33) {
            // msg_seqno too high never seems to happen but just in case
            this._state._sequence -= 16;
        }
        else {
            for (const state of states) {
                state.reject(new errors_1.BadMessageError(state.request, badMsg.errorCode));
            }
            return;
        }
        // Messages are to be re-sent once we've corrected the issue
        this._sendQueue.extend(states);
        this._log.debug(`${states.length} messages will be resent due to bad msg`);
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
        const msgId = message.obj.answerMsgId;
        this._log.debug(`Handling detailed info for message ${msgId}`);
        this._pendingAck.add(msgId);
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
        const msgId = message.obj.answerMsgId;
        this._log.debug(`Handling new detailed info for message ${msgId}`);
        this._pendingAck.add(msgId);
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
        this._log.debug("Handling new session created");
        this._state.salt = message.obj.serverSalt;
    }
    /**
     * Handles a server acknowledge about our messages. Normally these can be ignored
     */
    _handleAck() { }
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
        this._log.debug(`Handling future salts for message ${message.msgId}`);
        const state = this._pendingState.getAndDelete(message.msgId);
        if (state) {
            state.resolve(message.obj);
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
        this._sendQueue.append(new RequestState_1.RequestState(new tl_1.Api.MsgsStateInfo({
            reqMsgId: message.msgId,
            info: String.fromCharCode(1).repeat(message.obj.msgIds),
        })));
    }
    /**
     * Handles :tl:`MsgsAllInfo` by doing nothing (yet).
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleMsgAll(message) { }
    reconnect() {
        if (this._userConnected && !this.isReconnecting) {
            this.isReconnecting = true;
            // we want to wait a second between each reconnect try to not flood the server with reconnects
            // in case of internal server issues.
            (0, Helpers_1.sleep)(1000).then(() => {
                this._log.info("Started reconnecting");
                this._reconnect();
            });
        }
    }
    async _reconnect() {
        this._log.debug("Closing current connection...");
        try {
            this._log.warn("[Reconnect] Closing current connection...");
            await this._disconnect();
        }
        catch (err) {
            this._log.warn("Error happened while disconnecting");
            if (this._client._errorHandler) {
                await this._client._errorHandler(err);
            }
            if (this._log.canSend(Logger_1.LogLevel.ERROR)) {
                console.error(err);
            }
        }
        this._sendQueue.clear();
        this._state.reset();
        const connection = this._connection;
        // For some reason reusing existing connection caused stuck requests
        // @ts-ignore
        const newConnection = new connection.constructor({
            ip: connection._ip,
            port: connection._port,
            dcId: connection._dcId,
            loggers: connection._log,
            proxy: connection._proxy,
            testServers: connection._testServers,
            socket: this._client.networkSocket,
        });
        await this.connect(newConnection, true);
        this.isReconnecting = false;
        this._sendQueue.prepend(this._pendingState.values());
        this._pendingState.clear();
        if (this._autoReconnectCallback) {
            await this._autoReconnectCallback();
        }
    }
}
exports.MTProtoSender = MTProtoSender;
MTProtoSender.DEFAULT_OPTIONS = {
    logger: null,
    retries: Infinity,
    delay: 2000,
    autoReconnect: true,
    connectTimeout: null,
    authKeyCallback: null,
    updateCallback: null,
    autoReconnectCallback: null,
    isMainSender: null,
    senderCallback: null,
    onConnectionBreak: undefined,
    securityChecks: true,
};
