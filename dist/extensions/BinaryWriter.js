"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryWriter = void 0;
class BinaryWriter {
    constructor(stream) {
        this._buffers = [stream];
    }
    write(buffer) {
        this._buffers.push(buffer);
    }
    getValue() {
        return Buffer.concat(this._buffers);
    }
}
exports.BinaryWriter = BinaryWriter;
