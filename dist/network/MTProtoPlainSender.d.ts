import { Api } from "../tl";
/**
 * MTProto Mobile Protocol plain sender (https://core.telegram.org/mtproto/description#unencrypted-messages)
 */
export declare class MTProtoPlainSender {
    private _state;
    private _connection;
    /**
     * Initializes the MTProto plain sender.
     * @param connection connection: the Connection to be used.
     * @param loggers
     */
    constructor(connection: any, loggers: any);
    /**
     * Sends and receives the result for the given request.
     * @param request
     */
    send(request: Api.AnyRequest): Promise<any>;
}
