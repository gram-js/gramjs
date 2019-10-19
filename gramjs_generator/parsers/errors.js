const fs = require('fs')
const csvParse = require('csv-parse/lib/sync')
const { snakeToCamelCase, variableSnakeToCamelCase } = require('../utils')

const KNOWN_BASE_CLASSES = {
    303: 'InvalidDCError',
    400: 'BadRequestError',
    401: 'UnauthorizedError',
    403: 'ForbiddenError',
    404: 'NotFoundError',
    406: 'AuthKeyError',
    420: 'FloodError',
    500: 'ServerError',
    503: 'TimedOutError',
}

/**
 * Gets the corresponding class name for the given error code,
 * this either being an integer (thus base error name) or str.
 */
const getClassName = (errorCode) => {
    if (typeof errorCode === 'number') {
        return KNOWN_BASE_CLASSES[Math.abs(errorCode)] || 'RPCError' + errorCode.toString().replace('-', 'Neg')
    }

    return snakeToCamelCase(
        errorCode
            .replace('FIRSTNAME', 'FIRST_NAME')
            .replace('SLOWMODE', 'SLOW_MODE')
            .toLowerCase(),
        'Error',
    )
}

class TelegramError {
    constructor(codes, name, description) {
        // TODO Some errors have the same name but different integer codes
        // Should these be split into different files or doesn't really matter?
        // Telegram isn't exactly consistent with returned errors anyway.
        [this.intCode] = codes
        this.stringCode = name
        this.subclass = getClassName(codes[0])
        this.subclassExists = Math.abs(codes[0]) in KNOWN_BASE_CLASSES
        this.description = description
        this.hasCaptures = name.includes('_X')

        if (this.hasCaptures) {
            this.name = variableSnakeToCamelCase(getClassName(name.replace('_X', '')))
            this.pattern = variableSnakeToCamelCase(name.replace('_X', '_(\\d+)'))
            this.captureName = variableSnakeToCamelCase(description.match(/{(\w+)}/)[1])
        } else {
            this.name = variableSnakeToCamelCase(getClassName(name))
            this.pattern = variableSnakeToCamelCase(name)
            this.captureName = null
        }
    }
}

/**
 * Parses the input CSV file with columns (name, error codes, description)
 * and yields `Error` instances as a result.
 */
const parseErrors = function* (csvFile) {
    const f = csvParse(fs.readFileSync(csvFile, { encoding: 'utf-8' })).slice(1)

    for (let line = 0; line < f.length; line++) {
        if (f[line].length !== 3) {
            throw new Error(`Columns count mismatch, unquoted comma in desc? (line ${line + 2})`)
        }

        let [name, codes, description] = f[line]

        codes =
            codes === '' ?
                [400] :
                codes.split(' ').map((x) => {
                    if (isNaN(x)) {
                        throw new Error(`Not all codes are integers (line ${line + 2})`)
                    }

                    return Number(x)
                })

        yield new TelegramError(codes, name, description)
    }
}

module.exports = {
    KNOWN_BASE_CLASSES,
    TelegramError,
    parseErrors,
}
