const MtProtoPlainSender = require("./MTProtoPlainSender");
const MTProtoState = require("./MTProtoState");
const Helpers = require("../utils/Helpers");
const {MsgsAck} = require("../tl/types");
const AuthKey = require("../crypto/AuthKey");
const AES = require("../crypto/AES");
const {RPCError} = require("../errors/RPCBaseErrors");
const RPCResult = require("../tl/core/RPCResult");
const MessageContainer = require("../tl/core/MessageContainer");
const GZIPPacked = require("../tl/core/GZIPPacked");
const TLMessage = require("../tl/core/TLMessage");

const format = require('string-format');
const {TypeNotFoundError} = require("../errors");
const {BadMessageError} = require("../errors");
const {InvalidDCError} = require("../errors");
const {gzip, ungzip} = require('node-gzip');
const MessagePacker = require("../extensions/MessagePacker");
const Pong = require("../tl/core/GZIPPacked");
const BadServerSalt = require("../tl/core/GZIPPacked");
const BadMsgNotification = require("../tl/core/GZIPPacked");
const MsgDetailedInfo = require("../tl/core/GZIPPacked");
const MsgNewDetailedInfo = require("../tl/core/GZIPPacked");
const NewSessionCreated = require("../tl/core/GZIPPacked");
const FutureSalts = require("../tl/core/GZIPPacked");
const MsgsStateReq = require("../tl/core/GZIPPacked");
const MsgResendReq = require("../tl/core/GZIPPacked");
const MsgsAllInfo = require("../tl/core/GZIPPacked");
//const {tlobjects} = require("../gramjs/tl/alltlobjects");
format.extend(String.prototype, {});

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

    /**
     * @param authKey
     * @param opt
     */
    constructor(authKey, opt = {
        loggers: null,
        retries: 5,
        delay: 1,
        autoReconnect: true,
        connectTimeout: null,
        authKeyCallback: null,
        updateCallback: null,
        autoReconnectCallback: null
    }) {
        this._connection = null;
        this._loggers = opt.loggers;
        this._log = opt.loggers;
        this._retries = opt.retries;
        this._delay = opt.delay;
        this._autoReconnect = opt.autoReconnect;
        this._connectTimeout = opt.connectTimeout;
        this._authKeyCallback = opt.authKeyCallback;
        this._updateCallback = opt.updateCallback;
        this._autoReconnectCallback = opt.autoReconnectCallback;

        /**
         * Whether the user has explicitly connected or disconnected.
         *
         * If a disconnection happens for any other reason and it
         * was *not* user action then the pending messages won't
         * be cleared but on explicit user disconnection all the
         * pending futures should be cancelled.
         */
        this._user_connected = false;
        this._reconnecting = false;
        this._disconnected = true;

        /**
         * We need to join the loops upon disconnection
         */
        this._send_loop_handle = null;
        this._recv_loop_handle = null;

        /**
         * Preserving the references of the AuthKey and state is important
         */
        this.authKey = authKey || new AuthKey(null);
        this._state = new MTProtoState(this.authKey, this._loggers);

        /**
         * Outgoing messages are put in a queue and sent in a batch.
         * Note that here we're also storing their ``_RequestState``.
         */
        this._send_queue = new MessagePacker(this._state,
            this._loggers);

        /**
         * Sent states are remembered until a response is received.
         */
        this._pending_state = {};

        /**
         * Responses must be acknowledged, and we can also batch these.
         */
        this._pending_ack = new Set();

        /**
         * Similar to pending_messages but only for the last acknowledges.
         * These can't go in pending_messages because no acknowledge for them
         * is received, but we may still need to resend their state on bad salts.
         */
        this._last_acks = [];

        /**
         * Jump table from response ID to method that handles it
         */

        this._handlers = {
            [RPCResult.CONSTRUCTOR_ID]: this._handleRPCResult,
            [MessageContainer.CONSTRUCTOR_ID]: this._handleContainer,
            [GZIPPacked.CONSTRUCTOR_ID]: this._handleGzipPacked,
            [Pong.CONSTRUCTOR_ID]: this._handlePong,
            [BadServerSalt.CONSTRUCTOR_ID]: this._handleBadServerSalt,
            [BadMsgNotification.CONSTRUCTOR_ID]: this._handleBadNotification,
            [MsgDetailedInfo.CONSTRUCTOR_ID]: this._handleDetailedInfo,
            [MsgNewDetailedInfo.CONSTRUCTOR_ID]: this._handleNewDetailedInfo,
            [NewSessionCreated.CONSTRUCTOR_ID]: this._handleNewSessionCreated,
            [MsgsAck.CONSTRUCTOR_ID]: this._handleAck,
            [FutureSalts.CONSTRUCTOR_ID]: this._handleFutureSalts,
            [MsgsStateReq.CONSTRUCTOR_ID]: this._handleStateForgotten,
            [MsgResendReq.CONSTRUCTOR_ID]: this._handleStateForgotten,
            [MsgsAllInfo.CONSTRUCTOR_ID]: this._handleMsgAll,
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
            this._log.info('User is already connected!');
            return false;
        }
        console.log("connecting sender");
        this._connection = connection;
        await this._connect();
        console.log("finished connecting sender");
        this._user_connected = true;
        return true;
    }

    is_connected() {
        return this._user_connected
    }

    /**
     * Cleanly disconnects the instance from the network, cancels
     * all pending requests, and closes the send and receive loops.
     */
    async disconnect() {
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
        if (!this._user_connected) {
            throw new Error('Cannot send requests while disconnected')
        }

        if (!utils.isArrayLike(request)) {
            let state = new RequestState(request);
            this._send_queue.push(state);
            return state;
        } else {
            throw new Error("not supported");
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
        //this._log.info('Connecting to {0}...'.replace("{0}", this._connection));
        await this._connection.connect();

        //this._log.debug("Connection success!");
        if (!this.authKey) {
            let plain = new MtProtoPlainSender(this._connection, this._loggers);
            let res = await authenticator.do_authentication(plain);
            this.authKey.key = res.key;
            this._state.time_offset = res.timeOffset;

            /**
             * This is *EXTREMELY* important since we don't control
             * external references to the authorization key, we must
             * notify whenever we change it. This is crucial when we
             * switch to different data centers.
             */
            if (this._authKeyCallback) {
                this._authKeyCallback(this.authKey)

            }

        }
        //this._log.debug('Starting send loop');
        this._send_loop_handle = this._send_loop();

        //this._log.debug('Starting receive loop');
        this._recv_loop_handle = this._recv_loop();

        // _disconnected only completes after manual disconnection
        // or errors after which the sender cannot continue such
        // as failing to reconnect or any unexpected error.

        //this._log.info('Connection to %s complete!', this._connection)

    }


    async _disconnected(error = null) {
        if (this._connection === null) {
            this._log.info('Not disconnecting (already have no connection)');
            return
        }
        this._log.info('Disconnecting from %s...', this._connection);
        this._user_connected = false;
        this._log.debug('Closing current connection...');
        await this._connection.disconnect()

    }

    /**
     * This loop is responsible for popping items off the send
     * queue, encrypting them, and sending them over the network.
     * Besides `connect`, only this method ever sends data.
     * @returns {Promise<void>}
     * @private
     */
    async _send_loop() {
        while (this._user_connected && !this._reconnecting) {
            if (this._pending_ack) {
                let ack = new RequestState(new MsgsAck(Array(this._pending_ack)));
                this._send_queue.push(ack);
                this._last_acks.push(ack);
                this._pending_ack.clear()
            }
            this._log.debug('Waiting for messages to send...');
            // TODO Wait for the connection send queue to be empty?
            // This means that while it's not empty we can wait for
            // more messages to be added to the send queue.
            let {batch, data} = await this._send_queue.get();

            if (!data) {
                continue
            }
            this._log.debug(`Encrypting ${batch.length} message(s) in ${data.length} bytes for sending`);

            data = this._state.encryptMessageData(data);
            try {
                await this._connection.send(data);
            } catch (e) {
                console.log(e);
                this._log.info('Connection closed while sending data');
                return
            }

        }
    }


    async _recv_loop() {
        let body, message;

        while (this._user_connected && !this._reconnecting) {
            //this._log.debug('Receiving items from the network...');
            try {
                body = await this._connection.recv();
            } catch (e) {
                //this._log.info('Connection closed while receiving data');
                return
            }
            try {
                message = this._state.decryptMessageData(body);
            } catch (e) {
                console.log(e);

                if (e instanceof TypeNotFoundError) {
                    // Received object which we don't know how to deserialize
                    //this._log.info(`Type ${e.invalidConstructorId} not found, remaining data ${e.remaining}`);
                } else if (e instanceof SecurityError) {
                    // A step while decoding had the incorrect data. This message
                    // should not be considered safe and it should be ignored.
                    //this._log.warning(`Security error while unpacking a received message: ${e}`);
                    continue
                } else if (e instanceof InvalidBufferError) {
                    //this._log.info('Broken authorization key; resetting');
                    this.authKey.key = null;
                    if (this._authKeyCallback) {
                        this._authKeyCallback(null)
                    }
                    return
                } else {
                    //this._log.exception('Unhandled error while receiving data');
                    return
                }
            }
        }
        try {
            await this._processMessage(message)
        } catch (e) {
            //this._log.exception('Unhandled error while receiving data');
            console.log(e);
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
        this._pending_ack.add(message.msgId);
        let handler = this._handlers.get(message.obj.CONSTRUCTOR_ID, this.handleUpdate);
        await handler(message);
    }

    /**
     * Pops the states known to match the given ID from pending messages.
     * This method should be used when the response isn't specific.
     * @param msgId
     * @returns {Promise<[]>}
     * @private
     */
    async _popStates(msgId) {
        let state = this._pending_state.pop(msgId, null);
        if (state) {
            return [state];
        }

        let to_pop = [];

        for (state of this._pending_state.values()) {
            if (state.containerId === msgId) {
                to_pop.push(state.msgId);
            }
        }

        if (to_pop) {
            let temp = [];
            for (const x of to_pop) {
                temp.push(this._pending_state.pop(x));
            }
            return temp
        }

        for (let ack of this._last_acks) {
            if (ack.msgId === msgId)
                return [ack]
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
        let RPCResult = message.obj;
        let state = this._pending_state.pop(RPCResult.reqMsgId, null);
        this._log.debug(`Handling RPC result for message ${RPCResult.reqMsgId}`);

        if (!state) {
            // TODO We should not get responses to things we never sent
            // However receiving a File() with empty bytes is "common".
            // See #658, #759 and #958. They seem to happen in a container
            // which contain the real response right after.
            try {
                let reader = new BinaryReader(RPCResult.body);
                if (!(reader.tgReadObject() instanceof upload.File)) {
                    throw new TypeNotFoundError("Not an upload.File");
                }
            } catch (e) {
                if (e instanceof TypeNotFoundError) {
                    this._log.info(`Received response without parent request: ${RPCResult.body}`);
                    return
                } else {
                    throw e;
                }
            }
            if (RPCResult.error) {
                let error = RPCMessageToError(RPCResult.error, state.request);
                this._send_queue.append(
                    new RequestState(new MsgsAck([state.msgId]))
                );
            } else {
                let reader = new BinaryReader(RPCResult.body);
                let result = state.request.readResult(reader);
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
        this._log.debug('Handling container');
        for (let inner_message in message.obj.messages) {
            await this._processMessage(inner_message)
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
        this._log.debug('Handling gzipped data');
        let reader = new BinaryReader(message.obj.data);
        message.obj = reader.tgReadObject();
        await this._processMessage(message)
    }

    async _handleUpdate(message) {
        if (message.obj.SUBCLASS_OF_ID !== 0x8af52aac) {  // crc32(b'Updates')
            this._log.warning(`Note: %s is not an update, not dispatching it ${message.obj}`);
            return
        }
        this._log.debug('Handling update %s', message.obj.constructor.name);
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
        let pong = message.obj;
        this._log.debug(`Handling pong for message ${pong.msgId}`);
        let state = this._pending_state.pop(pong.msgId, null);
        // Todo Check result
        if (state) {
            state.future.set_result(pong)
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
        let badSalt = message.obj;
        this._log.debug(`Handling bad salt for message ${badSalt.badMsgId}`);
        this._state.salt = badSalt.newServerSalt;
        let states = this._popStates(badSalt.badMsgId);
        this._send_queue.extend(states);
        this._log.debug('%d message(s) will be resent', states.length);
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
        let badMsg = message.obj;
        let states = this._popStates(badMsg.badMsgId);
        this._log.debug(`Handling bad msg ${badMsg}`);
        if ([16, 17].contains(badMsg.errorCode)) {
            // Sent msg_id too low or too high (respectively).
            // Use the current msg_id to determine the right time offset.
            let to = this._state.updateTimeOffset(message.msgId);
            this._log.info(`System clock is wrong, set time offset to ${to}s`);
        } else if (badMsg.errorCode === 32) {
            // msg_seqno too low, so just pump it up by some "large" amount
            // TODO A better fix would be to start with a new fresh session ID
            this._state._sequence += 64
        } else if (badMsg.errorCode === 33) {
            // msg_seqno too high never seems to happen but just in case
            this._state._sequence -= 16
        } else {
            for (let state of states) {
                // TODO set errors;
                /* state.future.set_exception(
                BadMessageError(state.request, bad_msg.error_code))*/
            }

            return
        }
        // Messages are to be re-sent once we've corrected the issue
        this._send_queue.extend(states);
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
        let msgId = message.obj.answerMsgId;
        this._log.debug(`Handling detailed info for message ${msgId}`);
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
        let msgId = message.obj.answerMsgId;
        this._log.debug(`Handling new detailed info for message ${msgId}`);
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
        this._log.debug('Handling new session created');
        this._state.salt = message.obj.serverSalt;
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
        let ack = message.obj;
        this._log.debug(`Handling acknowledge for ${ack.msgIds}`);
        for (let msgId of ack.msgIds) {
            let state = this._pending_state[msgId];
            if (state && state.request instanceof LogOutRequest) {
                delete this._pending_state[msgId];
                state.future.set_result(true)
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
        this._log.debug(`Handling future salts for message ${message.msgId}`);
        let state = self._pending_state.pop(message.msgId, null);
        if (state) {
            state.future.set_result(message.obj)
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
        self._send_queue.append(new RequestState(new MsgsStateInfo(
            message.msgId, String.fromCharCode(1).repeat(message.obj.msgIds))))
    }

    /**
     * Handles :tl:`MsgsAllInfo` by doing nothing (yet).
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    async _handleMsgAll(message) {

    }

    /**
     * Adds an update handler (a method with one argument, the received
     * TLObject) that is fired when there are updates available
     * @param handler {function}
     */
    addUpdateHandler(handler) {
        let firstHandler = Boolean(this.onUpdateHandlers.length);
        this.onUpdateHandlers.push(handler);
        // If this is the first added handler,
        // we must start receiving updates
        if (firstHandler) {
            this.setListenForUpdates(true);
        }
    }

    /**
     * Removes an update handler (a method with one argument, the received
     * TLObject) that is fired when there are updates available
     * @param handler {function}
     */
    removeUpdateHandler(handler) {
        let index = this.onUpdateHandlers.indexOf(handler);
        if (index !== -1) this.onUpdateHandlers.splice(index, 1);
        if (!Boolean(this.onUpdateHandlers.length)) {
            this.setListenForUpdates(false);

        }
    }

    /**
     *
     * @param confirmed {boolean}
     * @returns {number}
     */
    generateSequence(confirmed) {
        if (confirmed) {
            let result = this.session.sequence * 2 + 1;
            this.session.sequence += 1;
            return result;
        } else {
            return this.session.sequence * 2;
        }
    }


    /**
     *
     * @param request
     */
    async receive(request) {
        try {
            //Try until we get an update
            while (!request.confirmReceived) {
                let {seq, body} = await this.transport.receive();
                let {message, remoteMsgId, remoteSequence} = this.decodeMsg(body);
                console.log("processing msg");
                await this.processMsg(remoteMsgId, remoteSequence, message, 0, request);
                console.log("finished processing msg");
            }
        } finally {
            // Todo
        }
    }

    // region Low level processing
    /**
     * Sends the given packet bytes with the additional
     * information of the original request.
     * @param packet
     * @param request
     */
    async sendPacket(packet, request) {
        request.msgId = this.session.getNewMsgId();
        // First Calculate plainText to encrypt it
        let first = Buffer.alloc(8);
        let second = Buffer.alloc(8);
        let third = Buffer.alloc(8);
        let forth = Buffer.alloc(4);
        let fifth = Buffer.alloc(4);
        first.writeBigUInt64LE(this.session.salt, 0);
        second.writeBigUInt64LE(this.session.id, 0);
        third.writeBigUInt64LE(request.msgId, 0);
        forth.writeInt32LE(this.generateSequence(request.confirmed), 0);
        fifth.writeInt32LE(packet.length, 0);
        let plain = Buffer.concat([
            first,
            second,
            third,
            forth,
            fifth,
            packet
        ]);
        let msgKey = Helpers.calcMsgKey(plain);
        let {key, iv} = Helpers.calcKey(this.session.authKey.key, msgKey, true);

        let cipherText = AES.encryptIge(plain, key, iv);

        //And then finally send the encrypted packet

        first = Buffer.alloc(8);
        first.writeBigUInt64LE(this.session.authKey.keyId, 0);
        let cipher = Buffer.concat([
            first,
            msgKey,
            cipherText,
        ]);
        await this.transport.send(cipher);
    }

    /**
     *
     * @param body {Buffer}
     * @returns {{remoteMsgId: number, remoteSequence: BigInt, message: Buffer}}
     */
    decodeMsg(body) {
        if (body.length < 8) {
            throw Error("Can't decode packet");
        }
        let remoteAuthKeyId = body.readBigInt64LE(0);
        let offset = 8;
        let msgKey = body.slice(offset, offset + 16);
        offset += 16;
        let {key, iv} = Helpers.calcKey(this.session.authKey.key, msgKey, false);
        let plainText = AES.decryptIge(body.slice(offset, body.length), key, iv);
        offset = 0;
        let remoteSalt = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteSessionId = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteMsgId = plainText.readBigInt64LE(offset);
        offset += 8;
        let remoteSequence = plainText.readInt32LE(offset);
        offset += 4;
        let msgLen = plainText.readInt32LE(offset);
        offset += 4;
        let message = plainText.slice(offset, offset + msgLen);
        return {message, remoteMsgId, remoteSequence}
    }

    async processMsg(msgId, sequence, reader, offset, request = undefined) {
        this.needConfirmation.push(msgId);
        let code = reader.readUInt32LE(offset);
        console.log("code is ", code);
        // The following codes are "parsed manually"
        if (code === 0xf35c6d01) {  //rpc_result, (response of an RPC call, i.e., we sent a request)
            console.log("got rpc result");
            return await this.handleRpcResult(msgId, sequence, reader, offset, request);
        }

        if (code === 0x73f1f8dc) {  //msg_container
            return this.handleContainer(msgId, sequence, reader, offset, request);
        }
        if (code === 0x3072cfa1) {  //gzip_packed
            return this.handleGzipPacked(msgId, sequence, reader, offset, request);
        }
        if (code === 0xedab447b) {  //bad_server_salt
            return await this.handleBadServerSalt(msgId, sequence, reader, offset, request);
        }
        if (code === 0xa7eff811) {  //bad_msg_notification
            console.log("bad msg notification");
            return this.handleBadMsgNotification(msgId, sequence, reader, offset);
        }
        /**
         * If the code is not parsed manually, then it was parsed by the code generator!
         * In this case, we will simply treat the incoming TLObject as an Update,
         * if we can first find a matching TLObject
         */
        console.log("code", code);
        if (code === 0x9ec20908) {
            return this.handleUpdate(msgId, sequence, reader, offset);
        } else {

            if (tlobjects.contains(code)) {
                return this.handleUpdate(msgId, sequence, reader);
            }
        }
        console.log("Unknown message");
        return false;
    }

    // region Message handling

    handleUpdate(msgId, sequence, reader, offset = 0) {
        let tlobject = Helpers.tgReadObject(reader, offset);
        for (let handler of this.onUpdateHandlers) {
            handler(tlobject);
        }
        return Float32Array
    }

    async handleContainer(msgId, sequence, reader, offset, request) {
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let size = reader.readInt32LE(offset);
        offset += 4;
        for (let i = 0; i < size; i++) {
            let innerMsgId = reader.readBigUInt64LE(offset);
            offset += 8;
            let innerSequence = reader.readInt32LE(offset);
            offset += 4;
            let innerLength = reader.readInt32LE(offset);
            offset += 4;
            if (!(await this.processMsg(innerMsgId, sequence, reader, offset, request))) {
                offset += innerLength;
            }
        }
        return false;
    }

    async handleBadServerSalt(msgId, sequence, reader, offset, request) {
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let badMsgId = reader.readBigUInt64LE(offset);
        offset += 8;
        let badMsgSeqNo = reader.readInt32LE(offset);
        offset += 4;
        let errorCode = reader.readInt32LE(offset);
        offset += 4;
        let newSalt = reader.readBigUInt64LE(offset);
        offset += 8;
        this.session.salt = newSalt;

        if (!request) {
            throw Error("Tried to handle a bad server salt with no request specified");
        }

        //Resend
        await this.send(request, true);
        return true;
    }

    handleBadMsgNotification(msgId, sequence, reader, offset) {
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let requestId = reader.readUInt32LE(offset);
        offset += 4;
        let requestSequence = reader.readInt32LE(offset);
        offset += 4;
        let errorCode = reader.readInt32LE(offset);
        return new BadMessageError(errorCode);
    }

    async handleRpcResult(msgId, sequence, reader, offset, request) {
        if (!request) {
            throw Error("RPC results should only happen after a request was sent");
        }
        let buffer = Buffer.alloc(0);
        let code = reader.readUInt32LE(offset);
        offset += 4;
        let requestId = reader.readUInt32LE(offset);
        offset += 4;
        let innerCode = reader.readUInt32LE(offset);
        offset += 4;
        if (requestId === request.msgId) {
            request.confirmReceived = true;
        }

        if (innerCode === 0x2144ca19) {  // RPC Error
            console.log("Got an error");
            let errorCode = reader.readInt32LE(offset);
            offset += 4;
            let errorMessage = Helpers.tgReadString(reader, offset);
            offset = errorMessage.offset;
            errorMessage = errorMessage.data;
            let error = new RPCError(errorCode, errorMessage);
            if (error.mustResend) {
                request.confirmReceived = false;
            }
            if (error.message.startsWith("FLOOD_WAIT_")) {
                console.log("Should wait {}s. Sleeping until then.".format(error.additionalData));
                await Helpers.sleep();
            } else if (error.message.startsWith("PHONE_MIGRATE_")) {
                throw new InvalidDCError(error.additionalData);
            } else {
                throw error;
            }

        } else {
            console.log("no errors");
            if (innerCode === 0x3072cfa1) { //GZip packed
                console.log("Gzipped data");
                let res = Helpers.tgReadByte(reader, offset);
                let unpackedData = await ungzip(res.data);
                offset = res.offset;
                res = request.onResponse(unpackedData, offset);
                buffer = res.data;
                offset = res.offset;
            } else {
                console.log("plain data");
                offset -= 4;
                let res = request.onResponse(reader, offset);
                buffer = res.data;
                offset = res.offset;
            }
        }
        return {buffer, offset}

    }

    handleGzipPacked(msgId, sequence, reader, offset, request) {
        throw Error("not implemented");
        // TODO
    }

    setListenForUpdates(enabled) {

        if (enabled) {
            console.log("Enabled updates");
        } else {
            console.log("Disabled updates");
        }
    }

    updatesListenMethod() {
        while (true) {
            let {seq, body} = this.transport.receive();
            let {message, remoteMsgId, remoteSequence} = this.decodeMsg(body);
            this.processMsg(remoteMsgId, remoteSequence, message);

        }
    }
}

module.exports = MTProtoSender;
