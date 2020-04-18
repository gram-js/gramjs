const { functions, types } = require('../tl')
const utils = require('../Utils')

const MessageMethods = (superclass) => class extends superclass {
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
