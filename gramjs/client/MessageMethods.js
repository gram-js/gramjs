const { functions, types } = require('../tl')
const utils = require('../Utils')
const MessagesIter = require('./MessagesIter')
const IDsIter = require('./IDsIter')

const MessageMethods = superclass => class extends superclass {
    iterMessages( entity, {
        limit = null,
        offsetDate = null,
        offsetId = 0,
        maxId = 0,
        minId = 0,
        addOffset = 0,
        search = null,
        filter = null,
        fromUser = null,
        waitTime = null,
        ids = null,
        reverse = false,
    } = {}) {
        if (ids) {
            if (!Array.isArray(ids)) {
                ids = [ids]
            }

            return new IDsIter(this, {
                reverse: reverse,
                waitTime: waitTime,
                limit: ids.length,
                entity: entity,
                ids: ids,
            })
        }

        return new MessagesIter(this, {
            reverse: reverse,
            waitTime: waitTime,
            limit: limit,
            entity: entity,
            offsetId: offsetId,
            minId: minId,
            maxId: maxId,
            fromUser: fromUser,
            offsetDate: offsetDate,
            addOffset: addOffset,
            filter: filter,
            search: search,
        })
    }

    async getMessages(entity, options) {
        if (!('limit' in options)) {
            if ('minId' in options && 'maxId' in options) {
                options.limit = null
            } else {
                options.limit = 1
            }
        }

        const it = this.iterMessages(entity, options)
        return it.collect()
    }

    // async forwardMessages(
    //     entity,
    //     messages,
    //     fromPeer = null,
    //     silent = false,
    //     asAlbum = false,
    //     schedule = null
    // ) {
    //     const single = !array.isArray(messages)
    //     if (single) {
    //         messages = [messages]
    //     }

    //     entity = await this.getInputEntity(entity)
        
    //     if (fromPeer) {
    //         fromPeer = await this.getInputEntity(fromPeer)
    //         fromPeerId = await this.getPeerId(fromPeer)
    //     } else {
    //         fromPeerId = null
    //     }

        
    // }

    async sendMessage(entity, message, {
        replyTo = null,
        parseMode = null,
        linkPreview = true,
        file = null,
        forceDoument = false,
        clearDraft = false,
        buttons = null,
        silent = false,
        schedule = null,
    } = {}) {
        if (file) {
            return this.sendFile({
                entity, file, caption: message, replyTo, parseMode,
                forceDoument, buttons, clearDraft, silent, schedule,
            })
        }

        let request
        entity = await this.getInputEntity(entity)
        if (typeof message !== 'string' && message instanceof types.Message) {
            const markup = buttons ? message.replyMarkup : this.buildReplyMarkup(buttons)
            silent = silent || message.silent

            if (message.media && !(message.media instanceof types.MessageMediaWebPage)) {
                return this.sendFile({
                    entity,
                    file: message.media,
                    caption: message.message,
                    silent,
                    replyTo,
                    buttons: markup,
                    entities: message.entities,
                    schedule,
                })
            }

            request = new functions.messages.SendMessageRequest({
                peer: entity,
                message: message.message || '',
                silent: silent,
                replyToMsgId: utils.getMessageId(replyTo),
                replyMarkup: markup,
                entities: message.entities,
                clearDraft: clearDraft,
                noWebpage: !(message.media instanceof types.MessageMediaWebPage),
                scheduleDate: schedule,
            })
            message = message.message
        } else {
            let msgEnt
            [message, msgEnt] = await this._parseMessageText(message, parseMode)
            if (!message) {
                throw new Error('The message cannot be empty unless a file is provided')
            }

            request = new functions.messages.SendMessageRequest({
                peer: entity,
                message: message,
                entities: msgEnt,
                noWebpage: !linkPreview,
                replyToMsgId: utils.getMessageId(replyTo),
                clearDraft: clearDraft,
                silent: silent,
                replyMarkup: this.constructor.buildReplyMarkup(buttons),
                scheduleDate: schedule,
            })
        }

        const result = await this.invoke(request)
        if (result instanceof types.UpdateShortSentMessage) {
            message = types.Message({
                id: result.id,
                toId: utils.getPeer(entity),
                message: message,
                date: result.date,
                out: result.out,
                media: result.media,
                entities: result.entities,
                replyMarkup: request.replyMarkup,
            })
            message._finishInit(this, {}, entity)
            return message
        }

        return this._getResponseMessage(request, result, entity)
    }
}

module.exports = MessageMethods
