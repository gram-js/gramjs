/**
 * Converts a Telegram's RPC Error to a Python error.
 * @param rpcError the RPCError instance
 * @param request the request that caused this error
 * @constructor the RPCError as a Python exception that represents this error
 */
const {rpcErrorsObject} = require("./rpcerrorlist");

function RPCMessageToError(rpcError, request) {
    //Try to get the error by direct look-up, otherwise regex
    let cls = rpcErrorsObject[rpcError.errorMessage];
    if (cls) {
        return new cls(request);
    } else {
        return rpcError.errorMessage;
    }
}

module.exports = {
    RPCMessageToError
}