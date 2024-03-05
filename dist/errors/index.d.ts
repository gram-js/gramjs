/**
 * Converts a Telegram's RPC Error to a Python error.
 * @param rpcError the RPCError instance
 * @param request the request that caused this error
 * @constructor the RPCError as a Python exception that represents this error
 */
import { Api } from "../tl";
export declare function RPCMessageToError(rpcError: Api.RpcError, request: Api.AnyRequest): any;
export * from "./Common";
export * from "./RPCBaseErrors";
export * from "./RPCErrorList";
