const { EventBuilder, EventCommon } = require('./common')
const { types } = require('../tl')

/**
 * This event occurs whenever a new text message, or a message
 * with media is received.
 */
class NewMessage extends EventBuilder {
    constructor({
        outgoing = true,
        incoming = false,
        fromUsers = [],
        forwards = true,
        pattern = undefined,
    } = {}) {
        super()

        this.outgoing = outgoing
        this.incoming = incoming
        this.fromUsers = fromUsers
        this.forwards = forwards
        this.pattern = pattern

        if (!this.outgoing && !this.incoming) {
            throw new Error('one of incoming or outgoing must be true')
        }
    }

    async _resolve(client) {
        await super._resolve(client)
        // this.fromUsers = await _intoIdSet(client, this.fromUsers)
    }

    build(update, others = null, thisId = null) {
        let event

        if (!this.filter(update)) return

        if (update instanceof types.UpdateNewMessage || update instanceof types.UpdateNewChannelMessage) {
            event = new Event(update.message)
        } else if (update instanceof types.UpdateShortMessage) {
            event = new Event(new types.Message({
                out: update.out || false,
                mentioned: update.mentioned,
                mediaUnread: update.mediaUnread,
                silent: update.silent,
                id: update.id,
                // Note that to_id/from_id complement each other in private
                // messages, depending on whether the message was outgoing.
                toId: new types.PeerUser(update.out ? update.userId : thisId),
                fromId: update.out ? thisId : update.userId,
                message: update.message,
                date: update.date,
                fwdFrom: update.fwdFrom,
                viaBotId: update.viaBotId,
                replyToMsgId: update.replyToMsgId,
                entities: update.entities || [],
            }))
        } else if (update instanceof types.UpdateShortChatMessage) {
            event = new this.Event(new types.Message({
                out: update.out || false,
                mentioned: update.mentioned,
                mediaUnread: update.mediaUnread,
                silent: update.silent,
                id: update.id,
                toId: new types.PeerChat(update.chatId),
                fromId: update.fromId,
                message: update.message,
                date: update.date,
                fwdFrom: update.fwdFrom,
                viaBotId: update.viaBotId,
                replyToMsgId: update.replyToMsgId,
                entities: update.entities || [],
            }))
        } else {
            return
        }

        // Make messages sent to ourselves outgoing unless they're forwarded.
        // This makes it consistent with official client's appearance.
        const ori = event.message
        if (ori.toId instanceof types.PeerUser) {
            if (ori.fromId === ori.toId.userId && !ori.fwdFrom) {
                event.message.out = true
            }
        }
        return event
    }

    filter(update) {
        const message = update.message

        // Make sure this is a message object in the first place
        if (!(message instanceof types.Message)) {
            return false
        }

        // Check if the message is incoming or outgoing, and if
        // we want to accept whichever one it is
        if (message.out) {
            if (!this.outgoing) return false
        } else {
            if (!this.incoming) return false
        }

        // See if the message was sent by one of the `fromUsers`
        if (this.fromUsers.length > 0) {
            const valid = this.fromUsers.map((user) => {
                const id = 'id' in user ? user.id : user
                if (message.fromId === id) return true
                else return false
            })

            if (!valid.includes(true)) return false
        }

        // Check if the message was forwarded
        if (message.fwdFrom && !this.forwards) return false

        // Finally check the message text against a pattern
        if (this.pattern) {
            if (!message.message.match(this.pattern)) return false
        }

        return true
    }
}

class Event extends EventCommon {
    constructor(message) {
        super()
        this.message = message
    }
}

module.exports = NewMessage
