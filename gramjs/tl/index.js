const types = require('./types')
const functions = require('./functions')
const custom = require('./custom')
const patched = require('./patched')
const { TLObject, TLRequest } = require('./tlobject')

module.exports = {
    types,
    functions,
    custom,
    patched,
    TLObject,
    TLRequest,
}
