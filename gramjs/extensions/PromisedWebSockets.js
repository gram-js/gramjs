/* eslint-env browser */

const WebSocketClient = require('websocket').w3cwebsocket

const closeError = new Error('WebSocket was closed')

class PromisedWebSockets {
    constructor() {
        this.isBrowser = typeof process === 'undefined' ||
            process.type === 'renderer' ||
            process.browser === true ||
            process.__nwjs
        this.closed = true
    }

    async read(number) {
        if (this.closed) {
            console.log('couldn\'t read')
            throw closeError
        }

        await this.canRead 

        const toReturn = this.stream.slice(0, number)
        this.stream = this.stream.slice(number)
        if (this.stream.length === 0) {
            this.canRead = new Promise(resolve => {
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
        this.canRead = new Promise(resolve => {
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

        this.stream = Buffer.alloc(0)
        this.client = null

        this.canRead = new Promise(resolve => {
            this.resolveRead = resolve
        })

        this.closed = false
        this.website = this.getWebSocketLink(ip, port)
        this.client = new WebSocketClient(this.website, 'binary')
        return new Promise((resolve, reject) => {
            this.client.onopen = () => {
                this.receive()
                resolve(this)
            }
            this.client.onerror = reject
            this.client.onclose = () => {
                if (this.client.closed) {
                    this.resolveRead(false)
                    this.closed = true
                }
            }
        })
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
        this.closed = true
    }

    async receive() {
        this.client.onmessage = async message => {
            let data
            if (this.isBrowser) {
                data = Buffer.from(await new Response(message.data).arrayBuffer())
            } else {
                data = Buffer.from(message.data)
            }
            this.stream = Buffer.concat([this.stream, data])
            this.resolveRead(true)
        }
    }
}

module.exports = PromisedWebSockets
