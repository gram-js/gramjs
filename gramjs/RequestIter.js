const { sleep } = require('./Helpers')

class RequestIter {
    constructor(
        client,
        limit = null,
        reverse = false,
        waitTime = null,
        options = {},
    ) {
        this.client = client
        this.reverse = reverse
        this.waitTime = waitTime
        this.options = options
        this.limit = Math.max(limit || Infinity, 0)
        this.left = this.limit
        this.buffer = null
        this.index = 0
        this.total = null
        this.lastLoad = 0
    }

    async _init() {}

    async* [Symbol.asyncIterator]() {
        if (!this.buffer) {
            this.buffer = []
            if (await this._init(...this.options)) {
                this.left = this.buffer.length
            }
        }

        while (this.left > 0) {
            if (this.index == this.buffer.length) {
                if (this.waitTime) {
                    await sleep(this.waitTime - (Date.now() - this.lastLoad))
                }
                this.lastLoad = Date.now()
            }
    
            this.index = 0
            this.buffer = []
            if (await this._loadNextChunk()) {
                this.left = this.buffer.length
            }
    
            if (!this.buffer) {
                break
            }
    
            const result = this.buffer[this.index]
            this.left--
            this.index++
            yield result
        }
    }

    async collect() {
        const result = []
        for await (const value of this) {
            result.push(value)
        }
        return result
    }

    async _loadNextChunk() {
        throw 'Not implemented'
    }
}

module.exports = RequestIter
