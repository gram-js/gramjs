const SenderGetter = superclass => class extends superclass {
    _senderGetterInit({
        senderId = null,
        sender = null,
        inputSender = null,
    } = {}) {
        this._senderId = senderId
        this._sender = sender
        this._inputSender = inputSender
        this._client = null
    }

    /**
     * Returns the `User` or `Channel` that sent this object.
     * It may be `None` if Telegram didn't send the sender.
     *
     * If you only need the ID, use `senderId` instead
     *
     * If you need to call a method which needs
     * this chat, use `inputSender` instead.
     *
     * If you're using `events`, use `getSender()` instead.
     */
    get sender() {
        return this._sender
    }

    /**
     * Returns `sender`, but will make an API call to find the
     * sender unless it's already cached.
     *
     * If you only need the ID, use `senderId` instead.
     *
     * If you need to call a method which needs
     * this sender, use `getInputSender()` instead.
     */
    async getSender() {
        if ((!this._sender || this._senderMin) && await this.getInputSender()) {
            try {
                this._sender = await this._client.getEntity(this._inputSender)
            } catch (e) {
                await this._refetchSender()
            }
        }
        return this._sender
    }

    /**
     * This :tl:`InputPeer` is the input version of the user/channel who
     * sent the message. Similarly to `inputChat`, this doesn't have things
     * like username or similar, but still useful in some cases.
     *
     * @note this might not be available if the library can't
     * find the input chat, or if the message a broadcast on a channel.
     */
    get inputSender() {
        if (!this._inputSender && this._senderId && this._client) {
            this._inputSender = this._client._entityCache[this._senderId] || null
        }
        return this._inputSender
    }

    /**
     * Returns `inputSender`, but will make an API call to find the
     * input sender unless it's already cached.
     */
    async getInputSender() {
        if (!this._inputSender && this._senderId && this._client) {
            await this._refetchSender()
        }
        return this._inputSender
    }

    /**
     * Returns the marked sender integer ID, if present.
     *
     * If there is a sender in the object, `senderId` will *always* be set,
     * which is why you should use it instead of `sender.id`.
     */
    get senderId() {
        return this._senderId
    }

    /**
     * Re-fetches sender information through other means.
     */
    async _refetchSender() {
        // TODO?
    }
}

module.exports = SenderGetter
