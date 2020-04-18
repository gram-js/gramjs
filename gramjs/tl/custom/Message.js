const { zip } = require('ramda')

const functions = require('../functions')
const types = require('../types')
const utils = require('../../Utils')
const errors = require('../../errors')
const { mix, sum, callable } = require('../../Helpers')
const { TLObject } = require('../tlobject')
const ChatGetter = require('./ChatGetter')
const SenderGetter = require('./SenderGetter')

class MessageBase extends TLObject {
    constructor({
        id = null,

        // Common to Message and MessageService (mandatory)
        toId = null, date = null,

        // Common to Message and MessageService (flags)
        out = null, mentioned = null, mediaUnread = null, silent = null,
        post = null, fromId = null, replyToMsgId = null,

        // For Message (mandatory)
        message = null,

        // For Message (flags)
        fwdFrom = null, viaBotId = null, media = null, replyMarkup = null,
        entities = null, views = null, editDate = null, postAuthor = null,
        groupedId = null, fromScheduled = null, legacy = null,
        editHide = null, restrictionReason = null,

        // For MessageAction (mandatory)
        action = null,
    } = {}) {
        if (!id) throw new TypeError('id is a required attribute for Message')
        super()

        // Common properties to all messages
        this.id = id
        this.toId = toId
        this.date = date
        this.out = out
        this.mentioned = mentioned
        this.mediaUnread = mediaUnread
        this.silent = silent
        this.post = post
        this.fromId = fromId
        this.replyToMsgId = replyToMsgId
        this.message = message
        this.fwdFrom = fwdFrom
        this.viaBotId = viaBotId
        this.media = media instanceof types.MessageMediaEmpty ? null : media

        this.replyMarkup = replyMarkup
        this.entities = entities
        this.views = views
        this.editDate = editDate
        this.postAuthor = postAuthor
        this.groupedId = groupedId
        this.fromScheduled = fromScheduled
        this.legacy = legacy
        this.editHide = editHide
        this.restrictionReason = restrictionReason
        this.action = action

        // Convenient storage for custom functions
        // TODO This is becoming a bit of bloat
        this._client = null
        this._text = null
        this._file = null
        this._replyMessage = null
        this._buttons = null
        this._buttonsFlat = null
        this._buttonsCount = null
        this._viaBot = null
        this._viaInputBot = null
        this._actionEntities = null

        let chatPeer
        if (!out && toId instanceof types.PeerUser) {
            chatPeer = new types.PeerUser({ userId: fromId })
            if (fromId == toId.userId) {
                this.out = !this.fwdFrom // Patch out in our chat
            }
        } else {
            chatPeer = toId
        }

        // Note: these calls would reset the client
        this._chatGetterInit({ chatPeer, broadcast: post })
        this._senderGetterInit({ senderId: fromId })

        if (post && !fromId && chatPeer) {
            // If the message comes from a Channel, let the sender be it
            this._senderId = utils.getPeerId(chatPeer)
        }

        this._forward = null
    }

    /**
     * Finishes the initialization of this message by setting
     * the client that sent the message and making use of the
     * known entities.
     *
     * @param {TelegramClient} client the client
     * @param {types.InputEntity[]} entities the entities
     * @param {types.InputChat} inputChat the input chat
     */
    _finishInit(client, entities, inputChat) {
        this._client = client
        const cache = client._entityCache

        ;[this._sender, this._inputSender] = utils._getEntityPair(this.senderId, entities, cache)

        ;[this._chat, this._inputChat] = utils._getEntityPair(this._chatId, entities, cache)

        if (inputChat) { // This has priority
            this._inputChat = inputChat
        }

        if (this._viaBotId) {
            [this._viaBot, this._viaInputBot] = this._getEntityPair(this._viaBotId, entities, cache)
        }

        if (this.fwdFrom) {
            // TODO: Implement Forward
            // this._forward = new Forward(this._client, this.fwdFrom, this.entities)
        }

        if (this.action) {
            if ((this.action instanceof types.MessageActionChatAddUser) ||
                    (this.action instanceof types.MessageActionChatCreate)) {
                this._actionEntities = this.action.users.map((i) => entities.get(i))
            } else if (this.action instanceof types.MessageActionChatDeleteUser) {
                this._actionEntities = [entities.get(this.action.userId)]
            } else if (this.action instanceof types.MessageActionChatJoinedByLink) {
                this._actionEntities = [entities.get(utils.getPeerId(
                    new types.PeerChannel({ channelId: this.action.channelId }),
                ))]
            } else if (this.action instanceof types.MessageActionChannelMigrateFrom) {
                this._actionEntities = [entities.get(utils.getPeerId(
                    types.PeerChat(this.action.chatId)),
                )]
            }
        }
    }

    get client() {
        return this._client
    }

    get text() {
        if (!this._text && this._client) {
            if (!this._client.parseMode) {
                this._text = this.message
            } else {
                this._text = this._client.parseMode.unparse(this.message, this.entities)
            }
        }
        return this._text
    }

    set text(value) {
        this._text = value
        if (this._client && this._client.parseMode) {
            [this.message, this.entities] = this._client.parseMode.parse(value)
        } else {
            this.message = value
            this.entities = []
        }
    }

    get rawText() {
        return this.message
    }

    /**
     * @param {string} value
     */
    set rawText(value) {
        this.message = value
        this.entities = []
        this._text = null
    }

    get isReply() {
        return !!this.replyToMsgId
    }

    get forward() {
        return this._forward
    }

    get buttons() {
        if (!this._buttons && this.replyMarkup) {
            if (!this.inputChat) {
                return null
            }

            const bot = this._neededMarkupBot()
            if (!bot) {
                this._setButtons(this._inputChat, bot)
            }
        }
        return this._buttons
    }

    async getButtons() {
        if (!this._buttons && this.replyMarkup) {
            const chat = await this.getInputChat()
            if (!chat) return
            let bot = this._neededMarkupBot()
            if (!bot) {
                await this._reloadMessage()
                bot = this._neededMarkupBot()
            }
            this._setButtons(chat, bot)
        }
        return this._buttons
    }

    get buttonCount() {
        if (!this._buttonsCount) {
            if ((this.replyMarkup instanceof types.ReplyInlineMarkup) ||
                    (this.replyMarkup instanceof types.ReplyKeyboardMarkup)) {
                this._buttonsCount = sum(this.replyMarkup.rows.map((r) => r.buttons.length))
            } else {
                this._buttonsCount = 0
            }
        }
        return this._buttonsCount
    }

    get file() {
        if (!this._file) {
            const media = this.photo || this.document
            if (media) {
                // TODO: Implement File
                // this._file = new File(media)
            }
        }
        return this._file
    }

    get photo() {
        if (this.media instanceof types.MessageMediaPhoto) {
            if (this.media.photo instanceof types.Photo)
                return this.media.photo
        } else if (this.action instanceof types.MessageActionChatEditPhoto) {
            return this.action.photo
        } else {
            return this.webPreview && this.webPreview instanceof types.Photo
                ? this.webPreview.photo
                : null
        }
        return null
    }

    get document() {
        if (this.media instanceof types.MessageMediaDocument) {
            if (this.media.document instanceof types.Document)
                return this.media.document
        } else {
            return this.webPreview && this.webPreview instanceof types.Document
                ? this.webPreview.document
                : null
        }
        return null
    }

    get webPreview() {
        if (this.media instanceof types.MessageMediaWebPage) {
            if (this.media.webpage instanceof types.WebPage)
                return this.media.webpage
        }
        return null
    }

    get audio() {
        return this._documentByAttribute(types.DocumentAttributeAudio, (attr) => !attr.voice)
    }

    get voice() {
        return this._documentByAttribute(types.DocumentAttributeAudio, (attr) => !!attr.voice)
    }

    get video() {
        return this._documentByAttribute(types.DocumentAttributeVideo)
    }

    get videoNote() {
        return this._documentByAttribute(types.DocumentAttributeVideo, (attr) => !!attr.roundMessage)
    }

    get gif() {
        return this._documentByAttribute(types.DocumentAttributeAnimated)
    }

    get sticker() {
        return this._documentByAttribute(types.DocumentAttributeSticker)
    }

    get contact() {
        if (this.media instanceof types.DocumentAttributeContact)
            return this.media
        return null
    }

    get game() {
        if (this.media instanceof types.MessageMediaGame)
            return this.media.game
        return null
    }

    get geo() {
        if ((this.media instanceof types.MessageMediaGeo) ||
                (this.media instanceof types.MessageMediaGeoLive) ||
                (this.media instanceof types.MessageMediaVenue)) {
            return this.media.geo
        }
        return null
    }

    get invoice() {
        if (this.media instanceof types.MessageMediaInvoice)
            return this.media
        return null
    }

    get poll() {
        if (this.media instanceof types.MessageMediaPoll)
            return this.media
        return null
    }

    get venu() {
        if (this.media instanceof types.MessageMediaVenue)
            return this.media
        return null
    }

    get actionEntities() {
        return this._actionEntities
    }

    get viaBot() {
        return this._viaBot
    }

    get viaInputBot() {
        return this._viaInputBot
    }

    getEntitiesText(cls = null) {
        let ent = this.entities
        if (!ent || ent.length == 0) return

        if (cls)
            ent = ent.filter((v) => v instanceof cls)

        const texts = utils.getInnerText(this.message, ent)
        return zip(ent, texts)
    }

    async getReplyMessage() {
        if (!this._replyMessage && this._client) {
            if (!this.replyToMsgId) return null

            // Bots cannot access other bots' messages by their ID.
            // However they can access them through replies...
            this._replyMessage = await this._client.getMessages(
                this._isChannel ? await this.getInputChat() : null, {
                    ids: types.InputMessageReplyTo({ id: this.id }) })

            if (!this._replyMessage) {
                // ...unless the current message got deleted.
                //
                // If that's the case, give it a second chance accessing
                // directly by its ID.
                this._replyMessage = await this._client.getMessages(
                    this._isChannel ? this._inputChat : null, {
                        ids: this.replyToMsgId })
            }
        }
        return this._replyMessage
    }

    async respond(args) {
        if (this._client) {
            args.entity = await this.getInputChat()
            return this._client.sendMessage(args)
        }
    }

    async reply(args) {
        if (this._client) {
            args.replyTo = this.id
            args.entity = await this.getInputChat()
            return this._client.sendMessage(args)
        }
    }

    async forwardTo(args) {
        if (this._client) {
            args.messages = this.id
            args.fromPeer = await this.getInputChat()
            return this._client.forwardMessages(args)
        }
    }

    async edit(args) {
        if (this.fwdFrom || !this.out || !this._client) return null
        args.entity = await this.getInputChat()
        args.message = this.id

        if (!('linkPreview' in args))
            args.linkPreview = !!this.webPreview

        if (!('buttons' in args))
            args.buttons = this.replyMarkup

        return this._client.editMessage(args)
    }

    async delete(args) {
        if (this._client) {
            args.entity = await this.getInputChat()
            args.messages = [this.id]
            return this._client.deleteMessages(args)
        }
    }

    async downloadMedia(args) {
        if (this._client)
            return this._client.downloadMedia(args)
    }

    async click({ i = null, j = null, text = null, filter = null, data = null }) {
        if (!this._client) return

        if (data) {
            if (!(await this._getInputChat()))
                return null

            try {
                return await this._client.invoke(functions.messages.GetBotCallbackAnswerRequest({
                    peer: this._inputChat,
                    msgId: this.id,
                    data: data,
                }))
            } catch (e) {
                if (e instanceof errors.BotTimeout)
                    return null
            }
        }

        if ([i, text, filter].filter((x) => !!x) > 1)
            throw new Error('You can only set either of i, text or filter')

        if (!(await this.getButtons()))
            return

        if (text) {
            if (callable(text)) {
                for (const button of this._buttonsFlat) {
                    if (text(button.text)) {
                        return button.click()
                    }
                }
            } else {
                for (const button of this._buttonsFlat) {
                    if (button.text === text) {
                        return button.click()
                    }
                }
            }
        }

        if (filter && callable(filter)) {
            for (const button of this._buttonsFlat) {
                if (filter(button)) {
                    return button.click()
                }
            }
            return null
        }

        i = !i ? 0 : i
        if (!j) return this._buttonsFlat[i].click()
        else return this._buttons[i][j].click()
    }

    async markRead() {
        if (this._client) {
            await this._client.sendReadAcknowledge({
                entity: await this.getInputChat(),
                maxId: this.id,
            })
        }
    }

    async pin(notify = false) {
        if (this._client) {
            await this._client.pinMessage({
                entity: await this.getInputChat(),
                message: this.id,
                notify: notify,
            })
        }
    }

    async _reloadMessage() {
        if (!this._client) return

        const chat = this.isChannel ? this.getInputChat() : null
        const msg = this._client.getMessages({ chat, ids: this.id })

        if (!msg) return

        this._sender = msg._sender
        this._inputSender = msg._inputender
        this._chat = msg._chat
        this._inputChat = msg._inputChat
        this._viaBot = msg._viaBot
        this._viaInputBot = msg._viaInputBot
        this._forward = msg._forward
        this._actionEntities = msg._actionEntities
    }

    async _refetchSender() {
        await this._reloadMessage()
    }

    _setButtons(chat, bot) {
        // TODO: Implement MessageButton
        // if (this._client && (this.replyMarkup instanceof types.ReplyInlineMarkup ||
        //         this.replyMarkup instanceof types.ReplyKeyboardMarkup)) {
        //     this._buttons = this.replyMarkup.rows.map((row) =>
        //         row.buttons.map((button) => new Messagebutton(this._client, button, chat, bot, this.id)))
        // }
        // this._buttonsFlat = this._buttons.flat()
    }

    _neededMarkupBot() {
        if (this._client && !(this.replyMarkup instanceof types.ReplyInlineMarkup ||
                this.replyMarkup instanceof types.ReplyKeyboardMarkup)) {
            return null
        }

        for (const row of this.replyMarkup.rows) {
            for (const button of row.buttons) {
                if (button instanceof types.KeyboardButtonSwitchInline) {
                    if (button.samePeer) {
                        const bot = this._inputSender
                        if (!bot) throw new Error('No input sender')
                        return bot
                    } else {
                        const ent = this._client._entityCache[this.viaBotId]
                        if (!ent) throw new Error('No input sender')
                        return ent
                    }
                }
            }
        }
    }

    _documentByAttribute(kind, condition = null) {
        const doc = this.document
        if (doc) {
            for (const attr of doc.attributes) {
                if (attr instanceof kind) {
                    if (!condition || (callable(condition) && condition(attr))) {
                        return doc
                    }
                    return null
                }
            }
        }
    }
}

class Message extends mix(MessageBase).with(ChatGetter, SenderGetter) {}

module.exports = Message
