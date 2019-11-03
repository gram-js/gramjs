const { types } = require('./tl')


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
        return new types.InputPeerChannel({ userId: entity.channelId, accessHash: entity.accessHash })
    }
    if (entity instanceof types.UserEmpty) {
        return new types.InputPeerEmpty()
    }
    if (entity instanceof types.UserFull) {
        return getInputPeer(entity.user)
    }

    if (entity instanceof types.ChatFull) {
        return new types.InputPeerChat(entity.id)
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
