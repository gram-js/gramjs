const { types } = require('./tl')

const USERNAME_RE = new RegExp('@|(?:https?:\\/\\/)?(?:www\\.)?' +
    '(?:telegram\\.(?:me|dog)|t\\.me)\\/(@|joinchat\\/)?')


const TG_JOIN_RE = new RegExp('tg:\\/\\/(join)\\?invite=')

const VALID_USERNAME_RE = new RegExp('^([a-z]((?!__)[\\w\\d]){3,30}[a-z\\d]|gif|vid|' +
    'pic|bing|wiki|imdb|bold|vote|like|coub)$')

function _raiseCastFail(entity, target) {
    throw new Error(`Cannot cast ${entity.constructor.name} to any kind of ${target}`)
}

/**
 Gets the input peer for the given "entity" (user, chat or channel).

 A ``TypeError`` is raised if the given entity isn't a supported type
 or if ``check_hash is True`` but the entity's ``access_hash is None``
 *or* the entity contains ``min`` information. In this case, the hash
 cannot be used for general purposes, and thus is not returned to avoid
 any issues which can derive from invalid access hashes.

 Note that ``check_hash`` **is ignored** if an input peer is already
 passed since in that case we assume the user knows what they're doing.
 This is key to getting entities by explicitly passing ``hash = 0``.

 * @param entity
 * @param allowSelf
 * @param checkHash
 */
function getInputPeer(entity, allowSelf = true, checkHash = true) {
    if (entity.SUBCLASS_OF_ID === undefined) {
        // e.g. custom.Dialog (can't cyclic import).

        if (allowSelf && 'inputEntity' in entity) {
            return entity.inputEntity
        } else if ('entity' in entity) {
            return getInputPeer(entity.entity)
        } else {
            _raiseCastFail(entity, 'InputPeer')
        }
    }
    if (entity.SUBCLASS_OF_ID === 0xc91c90b6) { // crc32(b'InputPeer')
        return entity
    }

    if (entity instanceof types.User) {
        if (entity.isSelf && allowSelf) {
            return new types.InputPeerSelf()
        } else if ((entity.accessHash !== undefined && !entity.min) || !checkHash) {
            return new types.InputPeerUser({
                userId: entity.id,
                accessHash: entity.accessHash,
            })
        } else {
            throw new Error('User without access_hash or min info cannot be input')
        }
    }
    if (entity instanceof types.Chat || entity instanceof types.ChatEmpty ||
        entity instanceof types.ChatForbidden) {
        return new types.InputPeerChat({ chatId: entity.id })
    }
    if (entity instanceof types.Channel) {
        if ((entity.accessHash !== undefined && !entity.min) || checkHash) {
            return new types.InputPeerChannel({ channelId: entity.id, accessHash: entity.accessHash })
        } else {
            throw new TypeError('Channel without access_hash or min info cannot be input')
        }
    }
    if (entity instanceof types.ChannelForbidden) {
        // "channelForbidden are never min", and since their hash is
        // also not optional, we assume that this truly is the case.
        return new types.InputPeerChannel({ channelId: entity.id, accessHash: entity.accessHash })
    }

    if (entity instanceof types.InputUser) {
        return new types.InputPeerUser({ userId: entity.userId, accessHash: entity.accessHash })
    }
    if (entity instanceof types.InputChannel) {
        return new types.InputPeerChannel({ channelId: entity.channelId, accessHash: entity.accessHash })
    }
    if (entity instanceof types.UserEmpty) {
        return new types.InputPeerEmpty()
    }
    if (entity instanceof types.UserFull) {
        return getInputPeer(entity.user)
    }

    if (entity instanceof types.ChatFull) {
        return new types.InputPeerChat({ chatId: entity.id })
    }

    if (entity instanceof types.PeerChat) {
        return new types.InputPeerChat(entity.chat_id)
    }

    _raiseCastFail(entity, 'InputPeer')
}

/**
 Similar to :meth:`get_input_peer`, but for :tl:`InputChannel`'s alone.

 .. important::

 This method does not validate for invalid general-purpose access
 hashes, unlike `get_input_peer`. Consider using instead:
 ``get_input_channel(get_input_peer(channel))``.

 * @param entity
 * @returns {InputChannel|*}
 */
function getInputChannel(entity) {
    if (entity.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(entity, 'InputChannel')
    }


    if (entity.SUBCLASS_OF_ID === 0x40f202fd) { // crc32(b'InputChannel')
        return entity
    }
    if (entity instanceof types.Channel || entity instanceof types.ChannelForbidden) {
        return new types.InputChannel({ channelId: entity.id, accessHash: entity.accessHash || 0 })
    }

    if (entity instanceof types.InputPeerChannel) {
        return new types.InputChannel({ channelId: entity.channelId, accessHash: entity.accessHash })
    }
    _raiseCastFail(entity, 'InputChannel')
}

/**
 Similar to :meth:`get_input_peer`, but for :tl:`InputUser`'s alone.

 .. important::

 This method does not validate for invalid general-purpose access
 hashes, unlike `get_input_peer`. Consider using instead:
 ``get_input_channel(get_input_peer(channel))``.

 * @param entity
 */
function getInputUser(entity) {
    if (entity.SUBCLASS_OF_ID === undefined) {
        _raiseCastFail(entity, 'InputUser')
    }
    if (entity.SUBCLASS_OF_ID === 0xe669bf46) { // crc32(b'InputUser')
        return entity
    }

    if (entity instanceof types.User) {
        if (entity.isSelf) {
            return new types.InputPeerSelf()
        } else {
            return new types.InputUser({
                userId: entity.id,
                accessHash: entity.accessHash || 0,
            })
        }
    }
    if (entity instanceof types.InputPeerSelf) {
        return new types.InputPeerSelf()
    }
    if (entity instanceof types.UserEmpty || entity instanceof types.InputPeerEmpty) {
        return new types.InputUserEmpty()
    }

    if (entity instanceof types.UserFull) {
        return getInputUser(entity.user)
    }

    if (entity instanceof types.InputPeerUser) {
        return new types.InputUser({ userId: entity.userId, accessHash: entity.accessHash })
    }

    _raiseCastFail(entity, 'InputUser')
}

/**
 Similar to :meth:`get_input_peer`, but for dialogs
 * @param dialog
 */
function getInputDialog(dialog) {
    try {
        if (dialog.SUBCLASS_OF_ID === 0xa21c9795) { // crc32(b'InputDialogPeer')
            return dialog
        }
        if (dialog.SUBCLASS_OF_ID === 0xc91c90b6) { // crc32(b'InputPeer')
            return new types.InputDialogPeer({ peer: dialog })
        }
    } catch (e) {
        _raiseCastFail(dialog, 'InputDialogPeer')
    }

    try {
        return new types.InputDialogPeer(getInputPeer(dialog))
        // eslint-disable-next-line no-empty
    } catch (e) {

    }
    _raiseCastFail(dialog, 'InputDialogPeer')
}

function getInputMessage(message) {
    try {
        if (typeof message == 'number') { // This case is really common too
            return new types.InputMessageID({
                id: message,
            })
        } else if (message.SUBCLASS_OF_ID === 0x54b6bcc5) { // crc32(b'InputMessage')
            return message
        } else if (message.SUBCLASS_OF_ID === 0x790009e3) { // crc32(b'Message')
            return new types.InputMessageID(message.id)
        }
        // eslint-disable-next-line no-empty
    } catch (e) {
    }

    _raiseCastFail(message, 'InputMessage')
}


function getPeer(peer) {
    try {
        if (typeof peer === 'number') {
            const res = resolveId(peer)

            if (res[1] === types.PeerChannel) {
                return new res[1]({ channelId: res[0] })
            } else if (res[1] === types.PeerChat) {
                return new res[1]({ chatId: res[0] })
            } else {
                return new res[1]({ userId: res[0] })
            }
        }
        if (peer.SUBCLASS_OF_ID === undefined) {
            throw new Error()
        }
        if (peer.SUBCLASS_OF_ID === 0x2d45687) {
            return peer
        } else if (peer instanceof types.contacts.ResolvedPeer ||
            peer instanceof types.InputNotifyPeer || peer instanceof types.TopPeer ||
            peer instanceof types.Dialog || peer instanceof types.DialogPeer) {
            return peer.peer
        } else if (peer instanceof types.ChannelFull) {
            return new types.PeerChannel({ channelId: peer.id })
        }
        if (peer.SUBCLASS_OF_ID === 0x7d7c6f86 || peer.SUBCLASS_OF_ID === 0xd9c7fc18) {
            // ChatParticipant, ChannelParticipant
            return new types.PeerUser({ userId: peer.userId })
        }
        peer = getInputPeer(peer, false, false)

        if (peer instanceof types.InputPeerUser) {
            return new types.PeerUser({ userId: peer.userId })
        } else if (peer instanceof types.InputPeerChat) {
            return new types.PeerChat({ chatId: peer.chatId })
        } else if (peer instanceof types.InputPeerChannel) {
            return new types.PeerChannel({ channelId: peer.channelId })
        }
        // eslint-disable-next-line no-empty
    } catch (e) {
        console.log(e)
    }
    _raiseCastFail(peer, 'peer')
}


/**
 Convert the given peer into its marked ID by default.

 This "mark" comes from the "bot api" format, and with it the peer type
 can be identified back. User ID is left unmodified, chat ID is negated,
 and channel ID is prefixed with -100:

 * ``user_id``
 * ``-chat_id``
 * ``-100channel_id``

 The original ID and the peer type class can be returned with
 a call to :meth:`resolve_id(marked_id)`.
 * @param peer
 * @param addMark
 */
function getPeerId(peer, addMark = true) {
    // First we assert it's a Peer TLObject, or early return for integers
    if (typeof peer == 'number') {
        return addMark ? peer : resolveId(peer)[0]
    }

    // Tell the user to use their client to resolve InputPeerSelf if we got one
    if (peer instanceof types.InputPeerSelf) {
        _raiseCastFail(peer, 'int (you might want to use client.get_peer_id)')
    }

    try {
        peer = getPeer(peer)
    } catch (e) {
        console.log(e)
        _raiseCastFail(peer, 'int')
    }
    if (peer instanceof types.PeerUser) {
        return peer.userId
    } else if (peer instanceof types.PeerChat) {
        // Check in case the user mixed things up to avoid blowing up
        if (!(0 < peer.chatId <= 0x7fffffff)) {
            peer.chatId = resolveId(peer.chatId)[0]
        }

        return addMark ? -(peer.chatId) : peer.chatId
    } else { // if (peer instanceof types.PeerChannel)
        // Check in case the user mixed things up to avoid blowing up
        if (!(0 < peer.channelId <= 0x7fffffff)) {
            peer.channelId = resolveId(peer.channelId)[0]
        }
        if (!addMark) {
            return peer.channelId
        }
        // Concat -100 through math tricks, .to_supergroup() on
        // Madeline IDs will be strictly positive -> log works.
        try {
            return -(peer.channelId + Math.pow(10, Math.floor(Math.log10(peer.channelId) + 3)))
        } catch (e) {
            throw new Error('Cannot get marked ID of a channel unless its ID is strictly positive')
        }
    }
}

/**
 * Given a marked ID, returns the original ID and its :tl:`Peer` type.
 * @param markedId
 */
function resolveId(markedId) {
    if (markedId >= 0) {
        return [markedId, types.PeerUser]
    }

    // There have been report of chat IDs being 10000xyz, which means their
    // marked version is -10000xyz, which in turn looks like a channel but
    // it becomes 00xyz (= xyz). Hence, we must assert that there are only
    // two zeroes.
    const m = markedId.toString().match(/-100([^0]\d*)/)
    if (m) {
        return [parseInt(m[1]), types.PeerChannel]
    }
    return [-markedId, types.PeerChat]
}

/**
 * returns an entity pair
 * @param entityId
 * @param entities
 * @param cache
 * @param getInputPeer
 * @returns {{inputEntity: *, entity: *}}
 * @private
 */
function _getEntityPair(entityId, entities, cache, getInputPeer = getInputPeer) {
    const entity = entities.get(entityId)
    let inputEntity = cache[entityId]
    if (inputEntity === undefined) {
        try {
            inputEntity = getInputPeer(inputEntity)
        } catch (e) {
            inputEntity = null
        }
    }
    return { entity, inputEntity }
}

function getMessageId(message) {
    if (message === null || message === undefined) {
        return null
    }
    if (typeof message == 'number') {
        return message
    }
    if (message.SUBCLASS_OF_ID === 0x790009e3) { // crc32(b'Message')
        return message.id
    }
    throw new Error(`Invalid message type: ${message.constructor.name}`)
}

/**
 * Parses the given phone, or returns `None` if it's invalid.
 * @param phone
 */
function parsePhone(phone) {
    if (typeof phone === 'number') {
        return phone.toString()
    } else {
        phone = phone.toString().replace(/[+()\s-]/gm, '')
        if (!isNaN(phone)) {
            return phone
        }
    }
}

/**
 Parses the given username or channel access hash, given
 a string, username or URL. Returns a tuple consisting of
 both the stripped, lowercase username and whether it is
 a joinchat/ hash (in which case is not lowercase'd).

 Returns ``(None, False)`` if the ``username`` or link is not valid.

 * @param username {string}
 */
function parseUsername(username) {
    username = username.trim()
    const m = username.match(USERNAME_RE) || username.match(TG_JOIN_RE)
    if (m) {
        username = username.replace(m[0], '')
        if (m[1]) {
            return { username: username, isInvite: true }
        } else {
            username = rtrim(username, '/')
        }
    }
    if (username.match(VALID_USERNAME_RE)) {
        return { username: username.toLowerCase(), isInvite: false }
    } else {
        return { username: null, isInvite: false }
    }
}

function rtrim(s, mask) {
    while (~mask.indexOf(s[s.length - 1])) {
        s = s.slice(0, -1)
    }
    return s
}

/**
 * Gets the display name for the given :tl:`User`,
 :tl:`Chat` or :tl:`Channel`. Returns an empty string otherwise
 * @param entity
 */
function getDisplayName(entity) {
    if (entity instanceof types.User) {
        if (entity.lastName && entity.firstName) {
            return `${entity.firstName} ${entity.lastName}`
        } else if (entity.firstName) {
            return entity.firstName
        } else if (entity.lastName) {
            return entity.lastName
        } else {
            return ''
        }
    } else if (entity instanceof types.Chat || entity instanceof types.Channel) {
        return entity.title
    }
    return ''
}

/**
 * check if a given item is an array like or not
 * @param item
 * @returns {boolean}
 */
function isListLike(item) {
    return (
        Array.isArray(item) ||
        (!!item &&
            typeof item === 'object' &&
            typeof (item.length) === 'number' &&
            (item.length === 0 ||
                (item.length > 0 &&
                    (item.length - 1) in item)
            )
        )
    )
}

module.exports = {
    getMessageId,
    _getEntityPair,
    getInputMessage,
    getInputDialog,
    getInputUser,
    getInputChannel,
    getInputPeer,
    parsePhone,
    parseUsername,
    getPeer,
    getPeerId,
    getDisplayName,
    resolveId,
    isListLike,
}
