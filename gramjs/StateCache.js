const types = require('./tl/types')

// For now we'll do this manually.
const _hasChannelId = [
    0x20adaef8,
    0x9c95f7bb,
    0xbddde532,
    0x51bdb021,
    0xeb0467fb,
    0xb6d45656,
    0x330b5424,
    0xc37521c9,
    0x98a12b4b,
    0x98592475,
    0x25d6c9c7,
    0x40771900,
    0x89893b45,
    0x70db6837,
    0xafeb712e,
    0x2a286531,
    0xec338270,
]

/**
 * In-memory update state cache with Map like behavior
 */
class StateCache extends Map {
    constructor(initial, logger) {
        super()
        if (initial != null) {
            this._ptsDate = [initial.pts, initial.date]
        } else {
            this._ptsDate = [null, null]
        }
        this._log = logger
    }

    reset() {
        this.clear()
    }

    /**
     * Update the state with the given update
     */
    update(update, {
        channelId = null,
        hasPts = [
            types.UpdateNewMessage,
            types.UpdateDeleteMessages,
            types.UpdateReadHistoryInbox,
            types.UpdateReadHistoryOutbox,
            types.UpdateWebPage,
            types.UpdateReadMessagesContents,
            types.UpdateEditMessage,
            types.updates.State,
            types.updates.DifferenceTooLong,
            types.UpdateShortMessage,
            types.UpdateShortChatMessage,
            types.UpdateShortSentMessage,
        ].map(t => t.CONSTRUCTOR_ID),
        hasDate = [
            types.UpdateUserPhoto,
            types.UpdateEncryption,
            types.UpdateEncryptedMessagesRead,
            types.UpdateChatParticipantAdd,
            types.updates.DifferenceEmpty,
            types.UpdateShortMessage,
            types.UpdateShortChatMessage,
            types.UpdateShort,
            types.UpdatesCombined,
            types.Updates,
            types.UpdateShortSentMessage,
        ].map(t => t.CONSTRUCTOR_ID),
        hasChannelPts = [
            types.UpdateChannelTooLong,
            types.UpdateNewChannelMessage,
            types.UpdateDeleteChannelMessages,
            types.UpdateEditChannelMessage,
            types.UpdateChannelWebPage,
            types.updates.ChannelDifferenceEmpty,
            types.updates.ChannelDifferenceTooLong,
            types.updates.ChannelDifference,
        ].map(t => t.CONSTRUCTOR_ID),
        checkOnly = false,
    } = {}) {
        const cid = update.CONSTRUCTOR_ID
        if (checkOnly) {
            return (cid in hasPts) || (cid in hasDate) || (cid in hasChannelPts)
        }

        if (cid in hasPts) {
            if (cid in hasDate) {
                this._ptsDate = [update.pts, update.date]
            } else {
                this._ptsDate = [update.pts, this._ptsDate[1]]
            }
        } else if (cid in hasDate) {
            this._ptsDate = [this._ptsDate[0], update.date]
        }

        if (cid in hasChannelPts) {
            if (!channelId) {
                channelId = this.getChannelId(update)
            }

            if (!channelId) {
                this._log.info(`Failed to retrieve channelId from ${update}`)
            } else {
                this.set(channelId, update.pts)
            }
        }
    }

    /**
     * Gets the **unmarked** channel ID from this update, if it has any.
     *
     * Fails for `*difference` updates, where `channelId`
     * is supposedly already known from the outside.
     */
    getChannelId(update, {
        hasChannelId = _hasChannelId,
        // Hardcoded because only some with message are for channels
        hasMessage = [
            types.UpdateNewChannelMessage,
            types.UpdateEditChannelMessage,
        ].map(t => t.CONSTRUCTOR_ID),
    } = {}) {
        const cid = update.CONSTRUCTOR_ID
        if (cid in hasChannelId) {
            return update.channelId
        } else if (cid in hasMessage) {
            if (!update.message.toId) {
                this._log.info(`Update has no 'toId' ${update}`)
            } else {
                return update.message.toId.channelId
            }
        }
    }

    /**
     * If `item` is `null`, returns the default `[pts, date]`.
     *
     * If it's an *unmarked* channel ID, returns it's `pts`.
     *
     * If no information is known, `pts` will be `null`.
     */
    get(item) {
        if (!item) {
            return this._ptsDate
        } else {
            return super.get(item)
        }
    }

    set(where, value) {
        if (!where) {
            this._ptsDate = value
        } else {
            super.set(where, value)
        }
    }
}

module.exports = StateCache
