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
import { AuthKey } from "../crypto/AuthKey";
import { TLMessage } from "../tl/core";
import { Api } from "../tl";
import bigInt from "big-integer";
import { RequestState } from "./RequestState";
import { Connection, UpdateConnectionState } from "./";
import type { TelegramClient } from "..";
import { CancellablePromise } from "real-cancellable-promise";
interface DEFAULT_OPTIONS {
    logger: any;
    retries: number;
    delay: number;
    autoReconnect: boolean;
    connectTimeout: any;
    authKeyCallback: any;
    updateCallback?: any;
    autoReconnectCallback?: any;
    isMainSender: boolean;
    dcId: number;
    senderCallback?: any;
    client: TelegramClient;
    onConnectionBreak?: CallableFunction;
    securityChecks: boolean;
}
export declare class MTProtoSender {
    static DEFAULT_OPTIONS: {
        logger: null;
        retries: number;
        delay: number;
        autoReconnect: boolean;
        connectTimeout: null;
        authKeyCallback: null;
        updateCallback: null;
        autoReconnectCallback: null;
        isMainSender: null;
        senderCallback: null;
        onConnectionBreak: undefined;
        securityChecks: boolean;
    };
    _connection?: Connection;
    private readonly _log;
    private _dcId;
    private readonly _retries;
    private readonly _delay;
    private _connectTimeout;
    private _autoReconnect;
    private readonly _authKeyCallback;
    _updateCallback: (client: TelegramClient, update: UpdateConnectionState) => void;
    private readonly _autoReconnectCallback?;
    private readonly _senderCallback;
    private readonly _isMainSender;
    _userConnected: boolean;
    isReconnecting: boolean;
    _reconnecting: boolean;
    _disconnected: boolean;
    private _sendLoopHandle;
    private _recvLoopHandle;
    readonly authKey: AuthKey;
    private readonly _state;
    private _sendQueue;
    private _pendingState;
    private readonly _pendingAck;
    private readonly _lastAcks;
    private readonly _handlers;
    private readonly _client;
    private readonly _onConnectionBreak?;
    userDisconnected: boolean;
    isConnecting: boolean;
    _authenticated: boolean;
    private _securityChecks;
    private _connectMutex;
    private _cancelSend;
    cancellableRecvLoopPromise?: CancellablePromise<any>;
    private _finishedConnecting;
    /**
     * @param authKey
     * @param opts
     */
    constructor(authKey: undefined | AuthKey, opts: DEFAULT_OPTIONS);
    set dcId(dcId: number);
    get dcId(): number;
    /**
     * Connects to the specified given connection using the given auth key.
     */
    connect(connection: Connection, force: boolean): Promise<boolean>;
    isConnected(): boolean;
    _transportConnected(): boolean | undefined;
    /**
     * Cleanly disconnects the instance from the network, cancels
     * all pending requests, and closes the send and receive loops.
     */
    disconnect(): Promise<void>;
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
    send(request: Api.AnyRequest): Promise<unknown> | undefined;
    addStateToQueue(state: RequestState): void;
    /**
     * Performs the actual connection, retrying, generating the
     * authorization key if necessary, and starting the send and
     * receive loops.
     * @returns {Promise<void>}
     * @private
     */
    _connect(): Promise<void>;
    _disconnect(): Promise<void>;
    _cancelLoops(): void;
    /**
     * This loop is responsible for popping items off the send
     * queue, encrypting them, and sending them over the network.
     * Besides `connect`, only this method ever sends data.
     * @returns {Promise<void>}
     * @private
     */
    _sendLoop(): Promise<void>;
    _recvLoop(): Promise<void>;
    _handleBadAuthKey(shouldSkipForMain?: boolean): void;
    /**
     * Adds the given message to the list of messages that must be
     * acknowledged and dispatches control to different ``_handle_*``
     * method based on its type.
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _processMessage(message: TLMessage): Promise<void>;
    /**
     * Pops the states known to match the given ID from pending messages.
     * This method should be used when the response isn't specific.
     * @param msgId
     * @returns {*[]}
     * @private
     */
    _popStates(msgId: bigInt.BigInteger): any[];
    /**
     * Handles the result for Remote Procedure Calls:
     * rpc_result#f35c6d01 req_msg_id:long result:bytes = RpcResult;
     * This is where the future results for sent requests are set.
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleRPCResult(message: TLMessage): void;
    /**
     * Processes the inner messages of a container with many of them:
     * msg_container#73f1f8dc messages:vector<%Message> = MessageContainer;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleContainer(message: TLMessage): Promise<void>;
    /**
     * Unpacks the data from a gzipped object and processes it:
     * gzip_packed#3072cfa1 packed_data:bytes = Object;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleGzipPacked(message: TLMessage): Promise<void>;
    _handleUpdate(message: TLMessage): Promise<void>;
    /**
     * Handles pong results, which don't come inside a ``RPCResult``
     * but are still sent through a request:
     * pong#347773c5 msg_id:long ping_id:long = Pong;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handlePong(message: TLMessage): Promise<void>;
    /**
     * Corrects the currently used server salt to use the right value
     * before enqueuing the rejected message to be re-sent:
     * bad_server_salt#edab447b bad_msg_id:long bad_msg_seqno:int
     * error_code:int new_server_salt:long = BadMsgNotification;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleBadServerSalt(message: TLMessage): Promise<void>;
    /**
     * Adjusts the current state to be correct based on the
     * received bad message notification whenever possible:
     * bad_msg_notification#a7eff811 bad_msg_id:long bad_msg_seqno:int
     * error_code:int = BadMsgNotification;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleBadNotification(message: TLMessage): Promise<void>;
    /**
     * Updates the current status with the received detailed information:
     * msg_detailed_info#276d3ec6 msg_id:long answer_msg_id:long
     * bytes:int status:int = MsgDetailedInfo;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleDetailedInfo(message: TLMessage): Promise<void>;
    /**
     * Updates the current status with the received detailed information:
     * msg_new_detailed_info#809db6df answer_msg_id:long
     * bytes:int status:int = MsgDetailedInfo;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleNewDetailedInfo(message: TLMessage): Promise<void>;
    /**
     * Updates the current status with the received session information:
     * new_session_created#9ec20908 first_msg_id:long unique_id:long
     * server_salt:long = NewSession;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleNewSessionCreated(message: TLMessage): Promise<void>;
    /**
     * Handles a server acknowledge about our messages. Normally these can be ignored
     */
    _handleAck(): void;
    /**
     * Handles future salt results, which don't come inside a
     * ``rpc_result`` but are still sent through a request:
     *     future_salts#ae500895 req_msg_id:long now:int
     *     salts:vector<future_salt> = FutureSalts;
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleFutureSalts(message: TLMessage): Promise<void>;
    /**
     * Handles both :tl:`MsgsStateReq` and :tl:`MsgResendReq` by
     * enqueuing a :tl:`MsgsStateInfo` to be sent at a later point.
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleStateForgotten(message: TLMessage): Promise<void>;
    /**
     * Handles :tl:`MsgsAllInfo` by doing nothing (yet).
     * @param message
     * @returns {Promise<void>}
     * @private
     */
    _handleMsgAll(message: TLMessage): Promise<void>;
    reconnect(): void;
    _reconnect(): Promise<void>;
}
export {};
