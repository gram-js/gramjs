const WebSocketClient = require('websocket').client
const tunnel = require('tunnel')

const closeError = new Error('WebSocket was closed')

class PromisedWebSockets {
    constructor(website) {
        this.website = website
        this.stream = Buffer.alloc(0)
        this.connection = null
        this.client = new WebSocketClient()

        this.canRead = new Promise((resolve) => {
            this.resolveRead = resolve
        })
        this.closed = false
        this.client.on('close', function() {
            this.resolveRead(false)
            this.closed = true
        }.bind(this))
    }

    async read(number) {
        if (this.closed || !await this.canRead) {
            console.log('wops ccouln\'t read')
            throw closeError
        }

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
            return 'wss://' + ip
        } else {
            return 'ws://' + ip
        }
    }

    async connect(ip, port) {
        const tunnelingAgent = tunnel.httpOverHttp({
            proxy: {
                host: '127.0.0.1',
                port: 8888,
            },
        })

        const requestOptions = {
            agent: tunnelingAgent,
        }

        this.website = this.getWebSocketLink(ip, port)
        //this.website = 'ws://echo.websocket.org'
        return new Promise(function(resolve, reject) {
            this.client.on('connect', function(connection) {
                this.connection = connection
                this.receive()
                resolve(connection)
            }.bind(this))
            this.client.on('connectFailed', function(error) {
                reject(error)
            })
            this.client.connect(this.website, null, null, null, requestOptions)
        }.bind(this))
    }

    write(data) {
        if (this.closed) {
            throw closeError
        }
        this.connection.send(data)
    }

    async close() {
        console.log('something happened. clsong')
        await this.connection.close()
        this.resolveRead(false)
        this.closed = true
    }

    async receive() {
        this.connection.on('message', function(message) {
            console.log(message)
            let data
            if (message.binaryData) {
                data = Buffer.from(message.binaryData)
            } else {
                data = Buffer.from(message.utf8Data, 'utf-8')
            }

            this.stream = Buffer.concat([this.stream, data])
            this.resolveRead(true)
        }.bind(this))
    }
}

module.exports = PromisedWebSockets
