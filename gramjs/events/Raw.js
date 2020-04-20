const { EventBuilder } = require('./common')

class Raw extends EventBuilder {
    constructor({
        types = [],
    } = {}) {
        super()
        this.types = Array.isArray(types) ? types : [types]
    }

    build(update) {
        if (this.types.length < 1) {
            return update
        }
        for (const _type of this.types) {
            if (update instanceof _type) {
                return update
            }
        }
    }
}

module.exports = Raw
