const Socket = require('net').Socket

const closeError = new Error('NetSocket was closed')

class PromisedNetSockets {
    constructor() {
        this.client = null


        this.closed = true
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
        this.stream = Buffer.alloc(0)

        this.client = new Socket()
        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve
        })
        this.closed = false
        return new Promise((resolve, reject) => {
            this.client.connect(port, ip, () => {
                this.receive()
                resolve(this)
            })
            this.client.on('error', reject)
            this.client.on('close', () => {
                if (this.client.closed) {
                    this.resolveRead(false)
                    this.closed = true
                }
            })
        })
    }

    write(data) {
        if (this.closed) {
            throw closeError
        }
        this.client.write(data)
    }

    async close() {
        await this.client.destroy()
        this.client.unref()
        this.closed = true
    }

    async receive() {
        this.client.on('data', async (message) => {
            const data = Buffer.from(message)
            this.stream = Buffer.concat([this.stream, data])
            this.resolveRead(true)
        })
    }
}

module.exports = PromisedNetSockets
