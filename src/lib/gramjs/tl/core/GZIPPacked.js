const struct = require('python-struct')
const { serializeBytes } = require("../index")
const { ungzip } = require('node-gzip')
const { gzip } = require('node-gzip')

class GZIPPacked {
    static CONSTRUCTOR_ID = 0x3072cfa1;
    static classType = "constructor"

    constructor(data) {
        this.data = data
        this.CONSTRUCTOR_ID = 0x3072cfa1
        this.classType = "constructor"
    }

    static async gzipIfSmaller(contentRelated, data) {
        if (contentRelated && data.length > 512) {
            const gzipped = await new GZIPPacked(data).toBytes()
            if (gzipped.length < data.length) {
                return gzipped
            }
        }
        return data
    }

    async toBytes() {
        return Buffer.concat([
            struct.pack('<I', GZIPPacked.CONSTRUCTOR_ID),
            serializeBytes(await gzip(this.data)),
        ])
    }

    static async read(reader) {
        const constructor = reader.readInt(false)
        if (constructor !== GZIPPacked.CONSTRUCTOR_ID) {
            throw new Error('not equal')
        }
        return await gzip(reader.tgReadBytes())
    }

    static async fromReader(reader) {
        return new GZIPPacked(await ungzip(reader.tgReadBytes()))
    }
}

module.exports = GZIPPacked
