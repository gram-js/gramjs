const utils = require('../Utils')
const helpers = require('../Helpers')
const { range, reverse } = require('ramda')
const { types } = require('../tl')
const isinstance = helpers.isinstance

const MessageParse = (superclass) => class extends superclass {
    async _parseMessageText(message, parseMode) {
        if (!parseMode) parseMode = this.parseMode
        else parseMode = utils.sanitizeParseMode(parseMode)

        if (!parseMode) return [message, []]

        let msgEntities
        [message, msgEntities] = parseMode.parse(message)
        for (const i of reverse(range(0, msgEntities.length))) {
            const e = msgEntities[i]
            if (e instanceof types.MessageEntityTextUrl) {
                const m = e.url.match(/^@|\+|tg:\/\/user\?id=(\d+)/)
                if (m) {
                    const user = m[1] ? Number(m[1]) : e.url
                    const isMention = await this._replaceWithMention(msgEntities, i, user)
                    if (!isMention) delete msgEntities[i]
                }
            } else if ((e instanceof types.MessageEntityMentionName) ||
                    (e instanceof types.InputMessageEntityMentionName)) {
                const isMention = await this._replaceWithMention(msgEntities, i, e.userId)
                if (!isMention) delete msgEntities[i]
            }
        }
        return [message, msgEntities]
    }

    async _replaceWithMention(entities, i, user) {
        try {
            entities[i] = new types.InputMessageEntityMentionName({
                offset: entities[i].offset,
                length: entities[i].length,
                userId: this.getInputEntity(user),
            })
            return true
        } catch (e) {
            return false
        }
    }

    _getResponseMessage(request, result, inputChat) {
        let updates
        let entities
        if (result instanceof types.UpdateShort) {
            updates = [result.update]
            entities = {}
        } else if ((result instanceof types.Updates) || (result instanceof types.UpdatesCombined)) {
            updates = result.updates
            entities = [result.users, result.chats].flat().reduce((acc, x) => {
                if (x)
                    acc[utils.getPeerId(x)] = x
                return acc
            }, {})
        } else {
            return null
        }

        const randomToId = {}
        const idToMessage = {}
        const schedToMessage = {} // scheduled IDs may collide with normal IDs
        for (const update of updates) {
            if (update instanceof types.UpdateMessageID) {
                randomToId[update.randomId] = update.id
            } else if (isinstance(update, [types.UpdateNewChannelMessage, types.UpdateNewMessage])) {
                update.message._finishInit(this, entities, inputChat)
                idToMessage[update.messageId] = update.message
            } else if (isinstance(update, types.UpdateEditMessage) &&
                    helpers.entityType(request.peer) !== helpers.EntityType.CHANNEL) {
                update.message._finishInit(this, entities, inputChat)

                // Live locations use `sendMedia` but Telegram responds with
                // `updateEditMessage`, which means we won't have `id` field.
                if (request.randomId)
                    idToMessage[update.message.id] = update.message
                else if (request.id === update.message.id)
                    return update.message
            } else if (isinstance(update, types.UpdateEditChannelMessage) &&
                    utils.getPeerId(request.peer) === utils.getPeerId(update.message.toId)) {
                if (request.id === update.message.id) {
                    update.message._finishInit(this, entities, inputChat)
                    return update.message
                }
            } else if (isinstance(update, types.UpdateMessagePoll)) {
                if (request.media.poll.id === update.poll.id) {
                    const msg = new types.Message({
                        id: request.id,
                        toId: utils.getPeer(request.peer),
                        media: new types.MessageMediaPoll({
                            poll: update.poll,
                            results: update.results,
                        }),
                    })
                    msg._finishInit(this, entities, inputChat)
                    return msg
                }
            }
        }

        if (!request)
            return idToMessage


        let mapping
        let opposite

        // Use the scheduled mapping if we got a request with a scheduled message
        //
        // This breaks if the schedule date is too young, however, since the message
        // is sent immediately, so have a fallback.
        if (!request.scheduleDate) {
            mapping = idToMessage
            opposite = {} // if there's no schedule it can never be scheduled
        } else {
            mapping = schedToMessage
            opposite = idToMessage // scheduled may be treated as normal, though
        }

        const randomId = typeof request === 'number' || isinstance(request, Array)
            ? request
            : request.randomId

        if (!Array.isArray(randomId)) {
            let msg = mapping[randomToId[randomId]]
            if (!msg) msg = opposite[randomToId[randomId]]
            if (!msg) this._log.warn(`Request ${request} had missing message mapping ${result}`)
            return msg
        }

        try {
            return randomId.map((a) => mapping[randomToId[a]])
        } catch {
            try {
                return randomId.map((a) => opposite[randomToId[a]])
            } catch {
                this._log.warn(`Request ${request} had missing message mapping ${result}`)
            }
        }

        return randomToId.map((rnd) =>
            mapping[randomToId[rnd]] || opposite[randomToId[rnd]])
    }
}

module.exports = MessageParse
