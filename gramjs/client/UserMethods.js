const { functions, types } = require('../tl')
const { EntityType, entityType } = require('../Helpers')
const utils = require('../Utils')

/**
 * @typedef {(types.User|types.Chat|types.Channel)} Entity
 * @typedef {(types.UserFull|types.messages.ChatFull|types.ChatFull|types.ChannelFull)} FullEntity
 * @typedef {(
    string |
    number |
    types.User |
    types.Chat |
    types.Channel |
    types.UserFull |
    types.messages.ChatFull |
    types.ChatFull |
    types.ChannelFull
   )} EntityLike
 */

/**
 * Handles all user related methods for `TelegramClient`
 * @param {TelegramClient} superclass the TelegramClient class
 */
const UserMethods = superclass => class extends superclass {
    /**
     * Gets "me", the current `User` that's logged in.
     * @param {bool} inputPeer whether to return the `InputPeerUser` version or
     * the normal `User`. This can be useful if you just need to know the ID
     * of yourself.
     * @returns {Promise<types.User|types.InputPeerUser>} your own `User`.
     */
    // TODO:
    // eslint-disable-next-line no-unused-vars
    async getMe(inputPeer = false) {
        const me = (await this.invoke(new functions.users
            .GetUsersRequest({ id: [new types.InputUserSelf()] })))[0]
        return me
    }

    /**
     * Returns `true` if the currently signed in user is a bot.
     * @returns {Promise<boolean>}
     */
    async isBot() {
        if (!this._bot && this._bot !== false) {
            this._bot = (await this.getMe()).bot
        }
        return this._bot
    }

    /**
     * Returns `true` if the user is authorized (logged in).
     * @returns {Promise<boolean>}
     */
    async isUserAuthorized() {
        if (!!this._authorized && this._authorized !== false) {
            try {
                await this.invoke(new functions.updates.GetStateRequest())
                this._authorized = true
            } catch {
                this._authorized = false
            }
        }
        return this._authorized
    }

    /**
     * Turns the given entity into a valid Telegram `types.User`, `types.Chat`, or
     * `types.Channel`. You can also pass am array of entites, and they will be
     * efficiently fetched from the network.
     *
     * @param {EntityLike|Array<EntityLike>} entity If a username is given, the username will be resolved making
     * an API call every time. Resolving usernames is an expensive operation and will start
     * hitting flood waits around 50 usernames in a short period of time.
     *
     * If you want to get the entity for a *cached* username, you should first run
     * `getInputEntity(username)` which will use the cache, then use `getEntity` with the
     * result of the previous call.
     *
     * Similar limits apply to invite links, you should use their ID instead.
     *
     * Using phone numbers (from people in your contact list), exact names, integer IDs,
     * or `tl.Peer` rely on a `getInputEntity` first, which in turn needs then entity
     * to be in the cache, unless a `tl.InputPeer` was used.
     *
     * @example
     * const { utils } = require('telegram/gramjs')
     *
     * const me = await client.getEntity('me')
     * console.log(utils.getDisplayName(me)
     *
     * const chat = await client.getInputEntity('username')
     * for await (message of client.iterMessages(chat)) {
     *     ...
     * }
     *
     * // Note: for this to work the phone number must be in your contacts
     * const someId = await client.getPeerId('+123456789101')
     *
     * @returns {(Promise<Entity|Array<Entity>>)} an entity corresponding to the input
     * entity. A list will be returned if one was given.
     */
    async getEntity(entities) {
        const single = !Array.isArray(entities)
        entities = Array.isArray(entities) ? entities : [entities]

        // Group input entities by string (resolve username),
        // input users (get users), input chat (get chats),
        // and input channels (get channels) to get the most
        // entites with the fewest API calls.
        const inputs = []
        for (const x of entities) {
            if (typeof(x) == 'string') {
                inputs.push(x)
            } else {
                inputs.push(await this.getInputEntity(x))
            }
        }

        const lists = {}
        lists[EntityType.USER] = []
        lists[EntityType.CHAT] = []
        lists[EntityType.CHANNEL] = []

        for (const x of inputs) {
            try {
                lists[entityType(x)].push(x)
            } catch {
                // Skip this input
                // Should we log a warning here?
            }
        }

        let users = lists[EntityType.USER]
        let chats = lists[EntityType.CHAT]
        let channels = lists[EntityType.CHANNEL]

        if (users.length > 0) {
            // GetUsersRequest has a limit of 200 per call
            let tmp = []
            while (users.length > 0) {
                const curr = users.slice(0, Math.min(users.length, 200))
                users = users.slice(Math.min(users.length, 200))
                tmp = tmp.concat(await this.invoke(new functions.users.GetUsersRequest({ id: curr })))
            }
            users = tmp
        }

        if (chats.length > 0) {
            // TODO: Handle a chat slice as above
            chats = await this.invoke(
                new functions.messages.GetChatsRequest({ id: chats.map(c => c.chatId) })).chats
        }

        if (channels.length > 0) {
            // TODO: Handle a chat slice as above
            channels = await this.invoke(
                new functions.channels.GetChannelsRequest({ id: channels })).chats
        }

        // Merge users, chats, and channels into a single object
        const idEntity = [users, chats, channels].flat().reduce((acc, x) => {
            acc[utils.getPeerId(x)] = x
            return acc
        }, {})

        const result = []
        for (const x of inputs) {
            if (typeof(x) == 'string') {
                result.push(await this._getEntityFromString(x))
            } else if (!(x instanceof types.InputPeerSelf)) {
                result.push(idEntity[utils.getPeerId(x)])
            } else {
                for (const u of Object.values(idEntity)) {
                    if (u instanceof types.User && u.isSelf) {
                        result.push(u)
                    }
                }
            }
        }

        return single ? result[0] : result
    }

    /**
     * Turns the given entity into its input entity version.
     *
     * Most requests use this kind of `InputPeer`, so this is the most
     * suitable call to make for those cases. *Generally you should let the
     * library do its job* and don't worry about getting the input entity
     * first, but if you're going to use an entity often, consider making the
     * call
     *
     * @param {(string|number|types.Peer|types.InputPeer)} entity
     * If a username or invite link is given, *the library will
     * use the cache*. This means that it's possible to be using
     * a username that *changed* or an old invite link (this only
     * happens if an invite link for a small group chat is used
     * after it was upgraded to a mega-group).
     *
     * If the username or ID from the invite link is not found in
     * the cache, it will be fetched. The same rules apply to phone
     * numbers (`'+34 123456789'`) from people in your contact list.
     *
     * If an exact name is given, it must be in the cache too. This
     * is not reliable as different people can share the same name
     * and which entity is returned is arbitrary, and should be used
     * only for quick tests.
     *
     * If a positive integer ID is given, the entity will be searched
     * in cached users, chats or channels, without making any call.
     *
     * If a negative integer ID is given, the entity will be searched
     * exactly as either a chat (prefixed with `-`) or as a channel
     * (prefixed with `-100`).
     *
     * If a `Peer` is given, it will be searched exactly in the
     * cache as either a user, chat or channel.
     *
     * If the given object can be turned into an input entity directly,
     * said operation will be done.
     *
     * Unsupported types will raise `TypeError`.
     *
     * If the entity can't be found, `ValueError` will be raised.
     *
     * @example
     * // If you're going to use "username" often in your code
     * // (make a lot of calls), consider getting its input entity
     * // once, and then using the "user" everywhere instead.
     * user = await client.get_input_entity('username')
     *
     * // The same applies to IDs, chats or channels.
     * chat = await client.get_input_entity(-123456789)
     *
     * @returns {(Promise<InputPeerUser|InputPeerChat|InputPeerChannel|InputPeerSelf>)}
     *
     * @note If you need to get the ID of yourself, you should use `getMe(true)`) instead.
     */
    async getInputEntity(peer) {
        // Short-circuit if the input parameter directly maps to an InputPeer
        try {
            return utils.getInputPeer(peer)
        } catch (e) {
            // Move on
        }

        // Next in priority is having a peer (or its ID) cached in-memory
        try {
            // 0x2d45687 == crc32(b'Peer')
            if (typeof peer === 'number' || peer.SUBCLASS_OF_ID === 0x2d45687) {
                if (this._entityCache.has(peer)) {
                    return this._entityCache[peer]
                }
            }
        } catch (e) {
            // Move on
        }

        // Then come known strings that take precedence
        if (['me', 'this'].includes(peer)) {
            return new types.InputPeerSelf()
        }
        // No InputPeer, cached peer, or known string. Fetch from disk cache
        try {
            return this.session.getInputEntity(peer)
        } catch (e) {
            // Move on
        }

        // Only network left to try
        if (typeof peer === 'string') {
            return utils.getInputPeer(await this._getEntityFromString(peer))
        }

        // If we're a bot and the user has messaged us privately users.getUsers
        // will work with access_hash = 0. Similar for channels.getChannels.
        // If we're not a bot but the user is in our contacts, it seems to work
        // regardless. These are the only two special-cased requests.
        peer = utils.getPeer(peer)
        if (peer instanceof types.PeerUser) {
            const users = await this.invoke(new functions.users.GetUsersRequest({
                id: [new types.InputUser({
                    userId: peer.userId, accessHash: 0,
                })],
            }))
            if (users && !(users[0] instanceof types.UserEmpty)) {
                // If the user passed a valid ID they expect to work for
                // channels but would be valid for users, we get UserEmpty.
                // Avoid returning the invalid empty input peer for that.
                //
                // We *could* try to guess if it's a channel first, and if
                // it's not, work as a chat and try to validate it through
                // another request, but that becomes too much work.
                return utils.getInputPeer(users[0])
            }
        } else if (peer instanceof types.PeerChat) {
            return new types.InputPeerChat({
                chatId: peer.chatId,
            })
        } else if (peer instanceof types.PeerChannel) {
            try {
                const channels = await this.invoke(new functions.channels.GetChannelsRequest({
                    id: [new types.InputChannel({
                        channelId: peer.channelId,
                        accessHash: 0,
                    })],
                }))

                return utils.getInputPeer(channels.chats[0])
                // eslint-disable-next-line no-empty
            } catch (e) {
                this._log.error(e)
            }
        }
        throw new Error(`Could not find the input entity for ${peer.id || peer.channelId || peer.chatId || peer.userId}.
        Please read https://docs.telethon.dev/en/latest/concepts/entities.html to find out more details.`)
    }
}

module.exports = UserMethods
