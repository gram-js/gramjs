/**
 * Converts a Telegram's RPC Error to a Python error.
 * @param rpcError the RPCError instance
 * @param request the request that caused this error
 * @constructor the RPCError as a Python exception that represents this error
 */
const { rpcErrorsObject, rpcErrorRe } = require('./RPCErrorList')

function RPCMessageToError(rpcError, request) {
    // Try to get the error by direct look-up, otherwise regex
    const cls = rpcErrorsObject[rpcError.errorMessage]
    if (cls) {
        // eslint-disable-next-line new-cap
        return new cls({ request: request })
    }
    for (const [msgRegex, Cls] of rpcErrorRe) {
        const m = rpcError.errorMessage.match(msgRegex)
        if (m) {
            const capture = m.length === 2 ? parseInt(m[1]) : null
            return new Cls({ request: request, capture: capture })
        }
    }
}

module.exports = {
    RPCMessageToError,
    ...require('./Common'),
    ...require('./RPCBaseErrors'),
    ...require('./RPCErrorList'),
}
