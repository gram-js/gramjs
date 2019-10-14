const struct = require("python-struct");

class TLObject {
    CONSTRUCTOR_ID = null;
    SUBCLASS_OF_ID = null;

    static prettyFormat() {
        // TODO
    }

    /**
     * Write bytes by using Telegram guidelines
     * @param data {Buffer|string}
     */
    static serializeBytes(data) {
        if (!(data instanceof Buffer)) {
            if (typeof data == "string") {
                data = Buffer.from(data);
            } else {
                throw Error(`Bytes or str expected, not ${data.constructor.name}`);
            }
        }
        let r = [];
        let padding;
        console.log(data.length)
        if (data.length < 254) {
            padding = (data.length + 1) % 4;
            if (padding !== 0) {
                padding = 4 - padding;
            }
            r.push(Buffer.from([data.length]));
            r.push(data);
        } else {
            padding = data.length % 4;
            if (padding !== 0) {
                padding = 4 - padding;
            }
            r.push(Buffer.from([
                254,
                data.length % 256,
                (data.length >> 8) % 256,
                (data.length >> 16) % 256,

            ]));
            r.push(data);
        }
        r.push(Buffer.alloc(padding).fill(0));
        return Buffer.concat(r);
    }

    static serializeDate(dt) {
        if (!dt) {
            return Buffer.alloc(4).fill(0);
        }
        if (dt instanceof Date) {
            dt = Math.floor((Date.now() - dt.getTime()) / 1000);
            console.log(dt);
        }
        if (typeof dt == "number") {
            return struct.pack('<i', dt)
        }
        throw Error(`Cannot interpret "${dt}" as a date`);

    }

    fromReader(reader) {
        throw Error("not implemented");
    }

}

/**
 * Represents a content-related `TLObject` (a request that can be sent).
 */
class TLRequest extends TLObject {
    /**
     *
     * @param reader {BinaryReader}
     * @returns {boolean}
     */
    static read_result(reader) {
        return reader.tgReadObject();
    }

    async resolve(self, client, utils) {

    }
}

module.exports = {
    TLObject,
    TLRequest
};