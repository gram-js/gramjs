export class BinaryWriter {
    private _stream: Buffer;

    constructor(stream: Buffer) {
        this._stream = stream;
    }

    write(buffer: Buffer) {
        this._stream = Buffer.concat([this._stream, buffer]);
    }

    getValue() {
        return this._stream;
    }
}
