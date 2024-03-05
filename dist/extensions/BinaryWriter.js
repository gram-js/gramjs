"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryWriter = void 0;
class BinaryWriter {
    constructor(stream) {
        this._stream = stream;
    }
    write(buffer) {
        this._stream = Buffer.concat([this._stream, buffer]);
    }
    getValue() {
        return this._stream;
    }
}
exports.BinaryWriter = BinaryWriter;
