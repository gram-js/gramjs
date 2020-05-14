const types = require('../types')
const errors = require('../../errors')
const utils = require('../../Utils')

const ChatGetter = superclass => class extends superclass {
    _chatGetterInit({
        chatPeer = null,
        inputChat = null,
        chat = null,
        broadcast = null,
    } = {}) {
        this._chatPeer = chatPeer
        this._inputChat = inputChat
        this._chat = chat
        this._broadcast = broadcast
        this._client = null
    }

    /**
     * Returns the `types.User`, `types.Chat`, or `types.Channel` that this
     * object belongs to. It could be `null` if Telegram didn't send the chat.
     *
     * If you only need the ID, use `chatId` instead.
     *
     * If you need to call a method which needs this chat, use `inputChat` instead.
     *
     * If you're using `events`, use `getChat` instead.
     *
     * @returns {(types.User|types.Chat|types.Channel)} the chat this object belongs to.
     */
    get chat() {
        return this._chat
    }

    /**
     * Returns `chat`, but makes an API call to find the chat unless
     * it's already cached.
     *
     * If you only need the ID, use `chatId` instead.
     *
     * If you need to call a method which needs this chat, use `inputChat` instead.
     *
     * @returns {(types.User|types.Chat|types.Channel)} the chat this object belongs to.
     */
    async getChat() {
        if (!this._chat || !this._chat.min && await this.getInputChat()) {
            try {
                this._chat = await this._client.getEntity()
            } catch {
                await this._refetchChat()
            }
        }
        return this._chat
    }

    /**
     * This `InputPeer` is the input version of the chat where the message was
     * sent. Similarly to `inputSender`, this doesn't have things like
     * username or similar, but it's still useful in some cases.
     *
     * @note this information might not be available if the library doesn't
     * have enough information.
     *
     * @returns {types.InputPeer} the `InputPeer` version of this object.
     */
    inputChat() {
        if (!this._inputChat && this._chatPeer && this._client) {
            this._inputChat = this._client._entityCache.get(this._chatPeer) || null
        }
        return this._inputChat
    }

    /**
     * Returns `inputChat`, but will make API calls to find the input
     * chat unless it's already checked.
     *
     * @returns {types.InputPeer} the `InputPeer` version of this object.
     */
    async getInputChat() {
        if (!this._inputChat && this._chatId && this._client) {
            try {
                // The chat may be recent, look in dialogs
                const target = this.chatId
                for await (const d of this._client.iterDialogs(100)) {
                    if (d.id == target) {
                        this._chat = d.entity
                        this._inputChat = d.inputEntity
                        break
                    }
                }
            } catch (e) {
                if (e instanceof errors.RPCError) {
                    // Do nothing
                }
            }
            return this._inputChat
        }
    }

    /**
     * Returns the marked chat integer ID. Note that this value *will
     * be different* from `toId` for incoming private messages, since
     * the chat *to* which the messages go is to your own person, but
     * the *chat* itself is with the one who sent the message.
     *
     * TL;DR; this gets the ID that you expect.
     *
     * If there is a chat in the object, `chatId` will *always* be set,
     * which is why you should use it instead of `chat.id`.
     */
    get chatId() {
        return this._chatPeer ? utils.getPeerId(this._chatPeer) : null
    }

    /**
     * Returns `true` if this message was sent as a private message.
     *
     * Returns `null` if there isn't enough information to make a determination.
     *
     * @returns {(bool|null)}
     */
    get isPrivate() {
        return this._chatPeer ? this._chatPeer instanceof types.PeerUser : null
    }

    /**
     * Returns `true` if the message was sent in a group or megagroup.
     *
     * Returns `null` if there isn't enough information to make a determination.
     *
     * @returns {(bool|null)}
     */
    get isGroup() {
        if (!this._broadcast && this.chat.broadcast) {
            this._broadcast = Boolean(this.chat.broadcast)
        }

        if (this._chatPeer instanceof types.PeerChannel) {
            if (!this._broadcast) {
                return null
            } else {
                return !this._broadcast
            }
        }

        return this._chatPeer instanceof types.PeerChat
    }

    /**
     * Returns `true` if the message was sent in a megagroup or channel.
     *
     * Returns `null` if there isn't enough information to make a determination.
     *
     * @returns {(bool|null)}
     */
    get isChannel() {
        return this._chatPeer instanceof types.PeerChannel
    }

    /**
     * Refreshes the chat through other means.
     */
    async refreshChat() {
        // TODO?
    }
}

module.exports = ChatGetter
