const { TLObject } = require('../tl/tlobject')
const { functions, types } = require('../tl')
const events = require('../events')
const Helpers = require('../Helpers')
const utils = require('../Utils')

const UpdateMethods = superclass => class extends superclass {
    async _updateLoop() {
        while (this.isConnected()) {
            const rnd = Helpers.getRandomInt(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
            await Helpers.sleep(1000 * 60)
            // We don't care about the result we just want to send it every
            // 60 seconds so telegram doesn't stop the connection
            try {
                this._sender.send(new functions.PingRequest({
                    pingId: rnd,
                }))
            } catch (e) {
                this._log.error('err is', e)
            }

            // this.session.save()

            // We need to send some content-related request at least hourly
            // for Telegram to keep delivering updates, otherwise they will
            // just stop even if we're connected. Do so every 30 minutes.

            // TODO Call getDifference instead since it's more relevant
            if (new Date().getTime() - this._lastRequest > 30 * 60 * 1000) {
                try {
                    await this.invoke(new functions.updates.GetStateRequest())
                } catch (e) {
                    this._log.error('err is', e)
                }
            }
        }
    }

    /**
     * Adds an event handler, allowing the specified callback to be
     * called when a matching event (or events) is received.
     */
    addEventHandler(callback, event = null) {
        if (Array.isArray(event)) {
            event.forEach(e => this.addEventHandler(callback, e))
            return
        }

        if (!event) {
            event = new events.Raw()
        } else if (event.prototype instanceof TLObject) {
            event = new events.Raw(event)
        }

        this._eventBuilders.push([event, callback])
    }

    /**
     * Alias for `addEventHandler`, but takes the event as the first
     * argument, and the callback as the second.
     * @param {Function} event
     * @param {Function} callback
     */
    on(event, callback) {
        this.addEventHandler(callback, event)
    }

    /**
     * Inverse of `addEventHandler`.
     *
     * If no event is given, all events for this callback are removed.
     * Returns how many callbacks were removed.
     *
     * @param {Function} callback the callback to remove
     * @param {Function} [event=null] the event to remove
     *
     * @returns {number} the number of matched and removed handlers.
     */
    removeEventHandler(callback, event = null) {
        let found = 0
        let i = this._eventBuilders.length
        while (i > 0) {
            i -= 1
            const [ev, cb] = this._eventBuilders[i]
            if ((cb == callback) && (!event || ev instanceof event)) {
                delete this._eventBuilders[i]
                found += 1
            }
        }
        return found
    }

    /**
     * Lists all registered event handlers.
     * @returns {Function[][]}
     */
    listEventHandlers() {
        return this._eventBuilders
    }

    /**
     * "Catches up" on the updates missed while the client was offline.
     * You should call this method after registering the event handlers
     * so that the updates it loads can be processed by your script.
     *
     * This can also be used to forcibly fetch new updates if there
     * are any.
     */
    catchUp() {
        // TODO
    }

    _handleUpdate(update) {
        this.session.processEntities(update)
        this._entityCache.add(update)

        if (update instanceof types.Updates || update instanceof types.UpdatesCombined) {
            // TODO deal with entities
            const entities = {}
            for (const x of [...update.users, ...update.chats]) {
                entities[utils.getPeerId(x)] = x
            }
            for (const u of update.updates) {
                this._processUpdate(u, update.updates, entities)
            }
        } else if (update instanceof types.UpdateShort) {
            this._processUpdate(update.update, null)
        } else {
            this._processUpdate(update, null)
        }

        this._stateCache.update(update)
    }

    _processUpdate(update, others, entities) {
        update._entities = entities || {}
        const args = {
            update: update,
            others: others,
        }
        this._dispatchUpdate(args)
    }

    async _dispatchUpdate(args = {
        update: null,
        others: null,
        channelId: null,
        ptsDate: null,
    }) {
        for (const [builder, callback] of this._eventBuilders) {
            console.log(builder)
            const event = builder.build(args.update)
            if (event) {
                await callback(event)
            }
        }
    }

    /**
     * Get the difference for this `chatId` if any, then load entities.
     *
     * Calls `updates.getDifference`, which fills the entity cache and
     * lets us know about the full entities.
     *
     * @param {types.Update} update
     * @param {number} channelId
     * @param {number} ptsDate
     */
    // TODO:
    // eslint-disable-next-line no-unused-vars
    _getDifference(update, channelId, ptsDate) {

    }
}

module.exports = UpdateMethods
