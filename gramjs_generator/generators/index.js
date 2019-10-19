const { generateErrors } = require('./errors')
const { generateTLObjects, cleanTLObjects } = require('./tlobject')
const { generateDocs } = require('./docs')

module.exports = {
    generateErrors,
    generateTLObjects,
    cleanTLObjects,
    generateDocs,
}
