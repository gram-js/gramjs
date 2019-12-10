const { serializeBytes } = require('../index')
const { inflate } = require('pako/dist/pako_inflate')

class GZIPPacked {
    static CONSTRUCTOR_ID = 0x3072cfa1
    static classType = 'constructor'

    constructor(data) {
        this.data = data
        this.CONSTRUCTOR_ID = 0x3072cfa1
        this.classType = 'constructor'
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

    static gzip(input) {
        throw new Error("Not Implemented")
    }

    static ungzip(input) {
        return Buffer.from(inflate(input))
    }

    async toBytes() {
        const g = Buffer.alloc(0)
        g.writeUInt32LE(GZIPPacked.CONSTRUCTOR_ID, 0)
        return Buffer.concat([
            g,
            serializeBytes(await GZIPPacked.gzip(this.data)),
        ])
    }

    static async read(reader) {
        const constructor = reader.readInt(false)
        if (constructor !== GZIPPacked.CONSTRUCTOR_ID) {
            throw new Error('not equal')
        }
        return await GZIPPacked.gzip(reader.tgReadBytes())
    }

    static async fromReader(reader) {
        return new GZIPPacked(await GZIPPacked.ungzip(reader.tgReadBytes()))
    }
}

module.exports = GZIPPacked
