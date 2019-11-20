const Socket = require('net').Socket

const closeError = new Error('WebSocket was closed')

class PromisedNetSockets {
    constructor() {
        this.stream = Buffer.alloc(0)
        this.client = null

        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve
        })
        this.closed = false
    }

    async read(number) {
        if (this.closed) {
            console.log('couldn\'t read')
            throw closeError
        }
        const canWe = await this.canRead

        const toReturn = this.stream.slice(0, number)
        this.stream = this.stream.slice(number)
        if (this.stream.length === 0) {
            this.canRead = new Promise((resolve) => {
                this.resolveRead = resolve
            })
        }

        return toReturn
    }

    async readAll() {
        if (this.closed || !await this.canRead) {
            throw closeError
        }
        const toReturn = this.stream
        this.stream = Buffer.alloc(0)
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve
        })
        return toReturn
    }

    /**
     * Creates a new connection
     * @param port
     * @param ip
     * @returns {Promise<void>}
     */
    async connect(port, ip) {
        this.client = new Socket()
        return new Promise(function(resolve, reject) {
            this.client.connect(port, ip, function() {
                this.receive()
                resolve(this)
            }.bind(this))
            this.client.on('error', function(error) {
                reject(error)
            })
            this.client.on('close', function() {
                if (this.client.closed) {
                    this.resolveRead(false)
                    this.closed = true
                }
            }.bind(this))
        }.bind(this))
    }

    write(data) {
        if (this.closed) {
            throw closeError
        }
        this.client.write(data)
    }

    async close() {
        await this.client.destroy()
        this.resolveRead(false)
        this.closed = true
    }

    async receive() {
        this.client.on('data', async function(message) {
            const data = Buffer.from(message)
            this.stream = Buffer.concat([this.stream, data])
            this.resolveRead(true)
        }.bind(this))
    }
}

module.exports = PromisedNetSockets
