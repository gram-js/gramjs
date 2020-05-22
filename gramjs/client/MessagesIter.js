const RequestIter = require('../RequestIter')
const helpers = require('../Helpers')
const utils = require('../Utils')
const {functions, types} = require('../tl')

const MAX_CHUNK_SIZE = 100

class MessagesIter extends RequestIter {
    async _init(
        entity = null,
        offsetId = null,
        minId = null,
        maxId = true,
        fromUser = null,
        offsetDate = false,
        addOffset = false,
        filter = null,
        search = false,
    ) {
        // Note that entity being `null` will perform a global search.
        if (entity) {
            this.entity = this.client.getInputEntity(entity)
        } else {
            this.entity = null
            if (this.reverse) {
                throw 'Cannot reverse a global search'
            }
        }

        // Telegram doesn't like minId/maxId. If these IDs are low enough
        // (starting from lastId - 100), the request will return nothing.
        //
        // We can emulate their behaviour locally by setting offset = maxId
        // and simply stopping once we hit a message with ID <= minId.
        if (this.reverse) {
            offsetId = Math.max(offsetId, minId)
            if (offsetId && maxId) {
                if (maxId - offsetId <= 1) {
                    return
                }
            }

            if (!maxId) {
                maxId = Infinity
            }
        } else {
            offsetId = Math.max(offsetId, maxId)
            if (offsetId && minId) {
                if (offsetId - minId <= 1) {
                    return
                }
            }
        }

        if (fromUser) {
            fromUser = await this.client.getInputEntity(fromUser)
            const ty = helpers.entityType(fromUser)
            if (ty != helpers.EntityType.USER) {
                fromUser = null // Ignore from_user unless it's a user
            }
        }

        if (fromUser) {
            this.fromId = await this.client.getPeerId(fromUser)
        } else {
            this.fromId = null
        }

        // `messages.searchGlobal` only works with text `search` queries.
        // If we want to perform global a search with `from_user` or `filter`,
        // we have to perform a normal `messages.search`, *but* we can make the
        // entity be `inputPeerEmpty`.
        if (!this.entity && (filter || fromUser)) {
            this.entity = new types.InputPeerEmpty()
        }

        if (!this.entity) {
            this.request = functions.messages.SearchGlobalRequest({
                q: search || '',
                offsetRate: offsetDate,
                offsetPeer: new types.InputPeerEmpty(),
                offsetId: offsetId,
                limit: 1,
            })
        } else if (search || filter || fromUser) {
            if (!filter) {
                filter = new types.InputMessagesFilterEmpty()
            }

            // Telegram completely ignores `fromId` in private chats
            const ty = helpers.entityType(this.entity)
            if (ty == helpers.EntityType.USER) {
                // Don't bother sending `fromUser` (it's ignored anyway),
                // but keep `fromId` defined above to check it locally.
                fromUser = null
            } else {
                // Don't bother sending `fromUser` (it's ignored anyway),
                // but keep `fromId` defined above to check it locally.
                this.fromId = null
            }

            this.request = functions.messages.SearchRequest({
                peer: this.entity,
                q: search || '',
                filter: typeof filter == 'function' ? new filter() : filter, // TODO: This could probably be done better
                minDate: null,
                maxDate: offsetDate,
                offsetId: offsetId,
                addOffset: addOffset,
                limit: 0, // Search actually returns 0 items if we ask it to
                maxId: 0,
                minId: 0,
                hash: 0,
                fromId: fromUser,
            })

            // Workaround Telethon issue #1124 until a better solution is found.
            // Telegram seemingly ignores `maxDate` if `filter` (and
            // nothing else) is specified, so we have to rely on doing
            // a first request to offset from the ID instead.
            //
            // Even better, using `filter` and `fromId` seems to always
            // trigger `RPC_CALL_FAIL` which is "internal issues"...
            if (filter && offsetDate && !search && !offsetId) {
                for await (const m of this.client.iterMessages(this.entity, {offsetId: 1, offsetDate: offsetDate})) {
                    this.request.offsetId = m.id + 1
                }
            }
        } else {
            this.request = functions.messages.GetHistoryRequest({
                peer: this.entity,
                limit: 1,
                offsetDate: offsetDate,
                offsetId: offsetId,
                minId: 0,
                maxId: 0,
                addOffset: addOffset,
                hash: 0,
            })
        }

        if (this.limit <= 0) {
            // No messages, but we still need to know the total message count
            const result = this.client.invoke(this.request)
            if (result instanceof types.messages.MessagesNotModified) {
                this.total = result.count
            } else {
                this.total = result.count || result.messages.length
            }

            return
        }

        if (!this.waitTime) {
            this.waitTime = this.limit > 3000 ? 1 : 0
        }

        // When going in reverse we need an offset of `-limit`, but we
        // also want to respect what the user passed, so add them together.
        if (this.reverse) {
            this.request.addOffset -= MAX_CHUNK_SIZE
        }

        this.addOffset = addOffset
        this.maxId = maxId
        this.minId = minId
        this.lastId = this.reverse ? 0 : Infinity
    }

    async _loadNextChunk() {
        this.request.limit = Math.min(this.left, MAX_CHUNK_SIZE)
        if (this.reverse && this.request.limit != MAX_CHUNK_SIZE) {
            // Remember that we need -limit when going in reverse
            this.request.addOffset = this.addOffset - this.request.limit
        }

        const r = await this.client.invoke(this.request)
        this.total = r.count || r.messages.length

        const entities = r.users.concat(r.chats).map(x => utils.getPeerId(x))
        const messages = this.reverse ? r.messages.reverse() : r.messages

        for (const message of messages) {
            if (message instanceof types.MessageEmpty || this.fromId && message.fromId != this.fromId) {
                continue
            }

            if (!this._messageInRange(message)) {
                return true
            }

            // There has been reports that on bad connections this method
            // was returning duplicated IDs sometimes. Using ``lastId``
            // is an attempt to avoid these duplicates, since the message
            // IDs are returned in descending order (or asc if reverse).
            this.lastId = message.id
            message._finishInit(this.client, entities, this.entity)
            this.buffer.push(message)
        }

        if (r.messages.length < this.request.limit) {
            return true
        }

        // Get the last message that's not empty (in some rare cases
        // it can happen that the last message is `MessageEmpty`)
        if (this.buffer) {
            this._updateOffset(this.buffer[this.buffer.length - 1])
        } else {
            // There are some cases where all the messages we get start
            // being empty. This can happen on migrated mega-groups if
            // the history was cleared, and we're using search. Telegram
            // acts incredibly weird sometimes. Messages are returned but
            // only "empty", not their contents. If this is the case we
            // should just give up since there won't be any new Message.
            return true
        }
    }

    /**
     * Determine whether the given message is in the range or
     * it should be ignored (and avoid loading more chunks).
     * 
     * @param {Message} message 
     */
    _messageInRange(message) {
        // No entity means message IDs between chats may vary
        if (this.entity) {
            if (this.reverse) {
                if (message.id <= this.lastId || message.id >= this.maxId) {
                    return false
                }
            } else {
                if (message.id >= this.lastId || message.id <= this.minId) {
                    return false
                }
            }
        }

        return true
    }

    /**
     * After making the request, update its offset with the last message.
     * 
     * @param {Message} lastMessage 
     */
    _updateOffset(lastMessage) {
        this.request.offsetId = lastMessage.id
        if (this.reverse) {
            // We want to skip the one we already have
            this.request.offsetId += 1
        }

        if (this.request instanceof functions.messages.SearchRequest) {
            // Unlike getHistory and searchGlobal that use *offset* date,
            // this is *max* date. This means that doing a search in reverse
            // will break it. Since it's not really needed once we're going
            // (only for the first request), it's safe to just clear it off.
            this.request.maxDate = null
        } else {
            // getHistory and searchGlobal call it offset_date
            this.request.offsetDate = lastMessage.date
        }

        if (this.request instanceof functions.messages.SearchGlobalRequest) {
            this.request.offsetPeer = lastMessage.inputChat
        }
    }
}

module.exports = MessagesIter
