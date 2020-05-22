const RequestIter = require('../RequestIter')
const helpers = require('../Helpers')
const utils = require('../Utils')
const {types, functions} = require('../tl')
const errors = require('../errors')

const MAX_CHUNK_SIZE = 100

class IDsIter extends RequestIter {
    async _init(entity, ids) {
        this.total = ids.length
        this._ids = this.reverse ? ids.reverse() : ids
        this._offset = 0
        this._entity = entity ? await this.client.getInputEntity(entity) : null
        this._ty = this._entity ? helpers.entityType(this._entity) : null

        // 30s flood wait every 300 messages (3 requests of 100 each, 30 of 10, etc.)
        if (!this.waitTime) {
            this.waitTime = this.limit > 300 ? 10 : 0
        }
    }

    async _loadNextChunk() {
        const ids = this.ids.slice(this._offset, Math.max(this._offset + MAX_CHUNK_SIZE, this.ids.length - 1))
        if (ids.length == 0) {
            return
        }

        this._offset += MAX_CHUNK_SIZE

        let fromId = null
        let r

        if (this._ty == helpers.EntityType.CHANNEL) {
            try {
                r = await this.client.invoke(new functions.channels.GetMessagesRequest(this._entity, ids))   
            } catch (error) {
                if (error instanceof errors.MessageIdsEmptyError) {
                    r = new types.messages.MessagesNotModified({count: ids.length})
                } else {
                    throw error
                }
            }
        } else {
            r = await this.client.invoke(new functions.messages.GetMessagesRequest({id: ids}))
            if (this._entity) {
                fromId = await this.client.getPeerId(this._entity)
            }
        }

        if (r instanceof types.messages.MessagesNotModified) {
            this.buffer = this.buffer.concat(new Array(ids.length).fill(null))
            return
        }

        const entities = r.users.concat(r.chats).map(x => utils.getPeerId(x))

        // Telegram seems to return the messages in the order in which
        // we asked them for, so we don't need to check it ourselves,
        // unless some messages were invalid in which case Telegram
        // may decide to not send them at all.
        //
        // The passed message IDs may not belong to the desired entity
        // since the user can enter arbitrary numbers which can belong to
        // arbitrary chats. Validate these unless `fromId is None`.
        for (const message of r.messages) {
            if ((message instanceof types.MessageEmpty) || fromId && message.chatId != fromId) {
                this.buffer.push(null)
            } else {
                message._finishInit(this.client, entities, this._entity)
                this.buffer.push(message)
            }
        }
    }
}

module.exports = IDsIter
