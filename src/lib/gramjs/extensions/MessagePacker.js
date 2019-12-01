const MessageContainer = require('../tl/core/MessageContainer')
const TLMessage = require('../tl/core/TLMessage')
const { TLRequest } = require('../tl/tlobject')
const BinaryWriter = require('../extensions/BinaryWriter')
const struct = require('python-struct')

class MessagePacker {
    constructor(state, logger) {
        this._state = state
        this._queue = []
        this._ready = new Promise(((resolve) => {
            this.setReady = resolve
        }))
        this._log = logger
    }

    values() {
        return this._queue
    }

    append(state) {
        this._queue.push(state)
        this.setReady(true)
    }

    extend(states) {
        for (const state of states) {
            this._queue.push(state)
        }
        this.setReady(true)
    }

    async get() {
        if (!this._queue.length) {
            this._ready = new Promise(((resolve) => {
                this.setReady = resolve
            }))
            await this._ready
        }
        let data
        let buffer = new BinaryWriter(Buffer.alloc(0))

        const batch = []
        let size = 0

        while (this._queue.length && batch.length <= MessageContainer.MAXIMUM_LENGTH) {
            const state = this._queue.shift()
            size += state.data.length + TLMessage.SIZE_OVERHEAD
            if (size <= MessageContainer.MAXIMUM_SIZE) {
                let afterId
                if (state.after) {
                    afterId = state.after.msgId
                }
                state.msgId = await this._state.writeDataAsMessage(
                    buffer, state.data, state.request instanceof TLRequest,
                    afterId,
                )

                this._log.debug(`Assigned msgId = ${state.msgId} to ${state.request.constructor.name}`)
                batch.push(state)
                continue
            }
            if (batch.length) {
                this._queue.unshift(state)
                break
            }
            this._log.warn(`Message payload for ${state.request.constructor.name} is too long ${state.data.length} and cannot be sent`)
            state.promise.reject('Request Payload is too big')
            size = 0
            continue
        }
        if (!batch.length) {
            return null
        }
        if (batch.length > 1) {
            data = Buffer.concat([struct.pack(
                '<Ii', MessageContainer.CONSTRUCTOR_ID, batch.length,
            ), buffer.getValue()])
            buffer = new BinaryWriter(Buffer.alloc(0))
            const containerId = await this._state.writeDataAsMessage(
                buffer, data, false,
            )
            for (const s of batch) {
                s.containerId = containerId
            }
        }

        data = buffer.getValue()
        return { batch, data }
    }
}

module.exports = MessagePacker
