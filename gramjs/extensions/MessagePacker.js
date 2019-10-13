const Helpers = require("../utils/Helpers");
const {TLRequest} = require("../tl/tlobject");

class MessagePacker {
    constructor(state,logger) {
        this._state = state;
        this._queue = [];
        this._ready = false;
    }

    append(state) {
        this._queue.push(state);
        this._ready = true;
    }

    extend(states) {
        for (let state of states) {
            this._queue.push(state);
        }
        this._ready = true;
    }

    async get() {
        if (!this._queue.length) {
            this._ready = false;
            while (!this._ready) {
                await Helpers.sleep(100);
            }
        }
        let data;
        let buffer = [];

        let batch = [];
        let size = 0;

        while (this._queue.length && batch.length <= 100) {
            let state = this._queue.shift();
            size += state.length + 12;
            if (size <= 1044448 - 8) {
                state.msgId = this._state.writeDataAsMessage(
                    buffer, state.data, state.request instanceof TLRequest,
                    state.after.msgId
                )
                batch.push(state);
                //log
                continue;
            }
            if (batch.length) {
                this._queue.unshift(state);
                break;
            }

            size = 0;
            continue
        }
        if (!batch.length) {
            return null;
        }
        if (batch.length > 1) {
            data = Buffer.concat([struct.pack(
                '<Ii', 0x73f1f8dc, batch.length
            ), buffer[0]]);
            buffer = [];
            let containerId = this._state.writeDataAsMessage(
                buffer, data, false
            );
            for (let s of batch) {
                s.containerId = containerId;
            }
        }

        data = buffer[0];
        return {batch, data}
    }
}

module.exports = MessagePacker;