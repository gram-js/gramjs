const WebSocketClient = require('websocket').w3cwebsocket

const closeError = new Error('WebSocket was closed')

class PromisedWebSockets {
    constructor() {
        this.isBrowser = typeof process === 'undefined' ||
            process.type === 'renderer' ||
            process.browser === true ||
            process.__nwjs
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

    getWebSocketLink(ip, port) {
        if (port === 443) {
            return 'ws://' + ip + '/apiws'
        } else {
            return 'ws://' + ip + '/apiws'
        }
    }

    async connect(port, ip) {
        console.log('trying to connect')
        this.website = this.getWebSocketLink(ip, port)
        this.client = new WebSocketClient(this.website, 'binary')
        return new Promise(function(resolve, reject) {
            this.client.onopen = function() {
                this.receive()
                resolve(this)
            }.bind(this)
            this.client.onerror = function(error) {
                reject(error)
            }
            this.client.onclose = function() {
                if (this.client.closed) {
                    this.resolveRead(false)
                    this.closed = true
                }
            }.bind(this)
        }.bind(this))
    }

    write(data) {
        if (this.closed) {
            throw closeError
        }
        this.client.send(data)
    }

    async close() {
        console.log('something happened. closing')
        await this.client.close()
        this.resolveRead(false)
        this.closed = true
    }

    async receive() {
        this.client.onmessage = async function(message) {
            let data
            if (this.isBrowser) {
                data = Buffer.from(await new Response(message.data).arrayBuffer())
            } else {
                data = Buffer.from(message.data)
            }
            this.stream = Buffer.concat([this.stream, data])
            this.resolveRead(true)
        }.bind(this)
    }
}

module.exports = PromisedWebSockets
