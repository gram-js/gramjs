const path = require('path')
const mime = require('mime-types')
const struct = require('python-struct')
const { markdown, html } = require('./extensions')
const { types } = require('./tl')

const USERNAME_RE = new RegExp('@|(?:https?:\\/\\/)?(?:www\\.)?' +
    '(?:telegram\\.(?:me|dog)|t\\.me)\\/(@|joinchat\\/)?')

const TG_JOIN_RE = new RegExp('tg:\\/\\/(join)\\?invite=')

const VALID_USERNAME_RE = new RegExp('^([a-z]((?!__)[\\w\\d]){3,30}[a-z\\d]|gif|vid|' +
    'pic|bing|wiki|imdb|bold|vote|like|coub)$')

function FileInfo(dcId, location, size) {
    this.dcId = dcId
    this.location = location
    this.size = size
}

/**
 Turns the given iterable into chunks of the specified size,
 which is 100 by default since that's what Telegram uses the most.

 * @param iter
 * @param size
 */
function* chunk(iter, size = 100) {
    let items = []
    let index = 0

    for (const item of iter) {
        items[index++] = item
        if (index === size) {
            yield items
            items = []
            index = 0
        }
    }

    if (index) {
        yield items
    }
}

/**
 Gets the display name for the given User, Chat,
 or Channel. Otherwise returns an empty string.
 */
function getDisplayName(entity) {
    if (entity instanceof types.User) {
        if (entity.lastName && entity.firstName) {
            return `${entity.firstName} ${entity.lastName}`
        } else if (entity.firstName) {
            return entity.firstName
        } else if (entity.lastName) {
            return entity.lastName
        }
    }

    if (entity instanceof types.Chat || entity instanceof types.Channel) {
        return entity.title
    }

    return ''
}

/**
 Gets the corresponding extension for any Telegram media.
 */
function getExtension(media) {
    // Photos are always compressed as .jpg by Telegram
    try {
        getInputPhoto(media)
        return '.jpg'
    } catch (err) {
        if ((media instanceof types.UserProfilePhoto) ||
            (media instanceof types.ChatPhoto)) {
            return '.jpg'
        }
    }

    // Documents will come with a mime type
    if (media instanceof types.MessageMediaDocument) {
        media = media.document
    }

    if ((media instanceof types.Document) ||
        (media instanceof types.WebDocument) ||
        (media instanceof types.WebDocumentNoProxy)) {
        if (media.mimeType === 'application/octet-stream') {
            // Octet stream are just bytes, which have no default extension
            return ''
        } else {
            const ext = mime.extension(media.mimeType)
            return ext ? '.' + ext : ''
        }
    }

    return ''
}

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
        return new types.InputPeerChat({
            chatId: entity.id,
        })
    }
    if (entity instanceof types.Channel) {
        if ((entity.accessHash !== undefined && !entity.min) || !checkHash) {
            return new types.InputPeerChannel({
                channelId: entity.id,
                accessHash: entity.accessHash,
            })
        } else {
            throw new TypeError('Channel without access_hash or min info cannot be input')
        }
    }
    if (entity instanceof types.ChannelForbidden) {
        // "channelForbidden are never min", and since their hash is
        // also not optional, we assume that this truly is the case.
        return new types.InputPeerChannel({
            channelId: entity.id,
            accessHash: entity.accessHash,
        })
    }

    if (entity instanceof types.InputUser) {
        return new types.InputPeerUser({
            userId: entity.userId,
            accessHash: entity.accessHash,
        })
    }
    if (entity instanceof types.InputChannel) {
        return new types.InputPeerChannel({
            channelId: entity.channelId,
            accessHash: entity.accessHash,
        })
    }
    if (entity instanceof types.UserEmpty) {
        return new types.InputPeerEmpty()
    }
    if (entity instanceof types.UserFull) {
        return getInputPeer(entity.user)
    }

    if (entity instanceof types.ChatFull) {
        return new types.InputPeerChat({
            chatId: entity.id,
        })
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
        return new types.InputChannel({
            channelId: entity.id,
            accessHash: entity.accessHash || 0,
        })
    }

    if (entity instanceof types.InputPeerChannel) {
        return new types.InputChannel({
            channelId: entity.channelId,
            accessHash: entity.accessHash,
        })
    }
    _raiseCastFail(entity, 'InputChannel')
}

/**
 *     Adds the JPG header and footer to a stripped image.
 Ported from https://github.com/telegramdesktop/tdesktop/blob/bec39d89e19670eb436dc794a8f20b657cb87c71/Telegram/SourceFiles/ui/image/image.cpp#L225

 * @param stripped{Buffer}
 * @returns {Buffer}
 */
function strippedPhotoToJpg(stripped) {
    // Note: Changes here should update _stripped_real_length
    if (stripped.length < 3 || stripped[0] !== 1) {
        return stripped
    }
    const header = Buffer.from('ffd8ffe000104a46494600010100000100010000ffdb004300281c1e231e19282321232d2b28303c64413c37373c7b585d4964918099968f808c8aa0b4e6c3a0aadaad8a8cc8ffcbdaeef5ffffff9bc1fffffffaffe6fdfff8ffdb0043012b2d2d3c353c76414176f8a58ca5f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8ffc00011080000000003012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00', 'hex')
    const footer = Buffer.from('ffd9', 'hex')
    header[164] = stripped[1]
    header[166] = stripped[2]
    return Buffer.concat([header, stripped.slice(3), footer])
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
        return new types.InputUser({
            userId: entity.userId,
            accessHash: entity.accessHash,
        })
    }

    _raiseCastFail(entity, 'InputUser')
}

function getInputLocation(location) {
    try {
        if (!location.SUBCLASS_OF_ID) {
            throw new Error()
        }
        if (location.SUBCLASS_OF_ID === 0x1523d462) {
            return {
                dcId: null,
                inputLocation: location,
            }
        }
    } catch (e) {
        _raiseCastFail(location, 'InputFileLocation')
    }
    if (location instanceof types.Message) {
        location = location.media
    }

    if (location instanceof types.MessageMediaDocument) {
        location = location.document
    } else if (location instanceof types.MessageMediaPhoto) {
        location = location.photo
    }

    if (location instanceof types.Document) {
        return {
            dcId: location.dcId,
            inputLocation: new types.InputDocumentFileLocation({
                id: location.id,
                accessHash: location.accessHash,
                fileReference: location.fileReference,
                thumbSize: '', // Presumably to download one of its thumbnails
            }),
        }
    } else if (location instanceof types.Photo) {
        return {
            dcId: location.dcId,
            inputLocation: new types.InputPhotoFileLocation({
                id: location.id,
                accessHash: location.accessHash,
                fileReference: location.fileReference,
                thumbSize: location.sizes[location.sizes.length - 1].type,
            }),
        }
    }

    if (location instanceof types.FileLocationToBeDeprecated) {
        throw new Error('Unavailable location cannot be used as input')
    }
    _raiseCastFail(location, 'InputFileLocation')
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
            return new types.InputDialogPeer({
                peer: dialog,
            })
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
    } catch (e) {}

    _raiseCastFail(message, 'InputMessage')
}

function getInputDocument(document) {
    try {
        if (document.SUBCLASS_OF_ID === 0xf33fdb68) {
            return document
        }
    } catch (err) {
        _raiseCastFail(document, 'InputMediaDocument')
    }

    if (document instanceof types.Document) {
        return new types.InputDocument({
            id: document.id,
            accessHash: document.accessHash,
            fileReference: document.fileReference,
        })
    }

    if (document instanceof types.DocumentEmpty) {
        return new types.InputDocumentEmpty()
    }

    if (document instanceof types.MessageMediaDocument) {
        return getInputDocument(document.document)
    }

    if (document instanceof types.Message) {
        return getInputDocument(document.media)
    }

    _raiseCastFail(document, 'InputDocument')
}

/**
 Similar to `getInputPeer`, but for photos.
 */
function getInputPhoto(photo) {
    try {
        if (photo.SUBCLASS_OF_ID === 0x846363e0) {
            return photo
        }
    } catch (err) {
        _raiseCastFail(photo, 'InputPhoto')
    }

    if (photo instanceof types.Message) {
        photo = photo.media
    }

    if ((photo instanceof types.photos.Photo) ||
        (photo instanceof types.MessageMediaPhoto)) {
        photo = photo.photo
    }

    if (photo instanceof types.Photo) {
        return new types.InputPhoto({
            id: photo.id,
            accessHash: photo.accessHash,
            fileReference: photo.fileReference,
        })
    }

    if (photo instanceof types.PhotoEmpty) {
        return new types.InputPhotoEmpty()
    }

    if (photo instanceof types.messages.ChatFull) {
        photo = photo.fullChat
    }

    if (photo instanceof types.ChannelFull) {
        return getInputPhoto(photo.chatPhoto)
    } else if (photo instanceof types.UserFull) {
        return getInputPhoto(photo.profilePhoto)
    } else if ((photo instanceof types.Photo) ||
        (photo instanceof types.Chat) ||
        (photo instanceof types.User)) {
        return getInputPhoto(photo.photo)
    }

    if ((photo instanceof types.UserEmpty) ||
        (photo instanceof types.ChatEmpty) ||
        (photo instanceof types.ChatForbidden) ||
        (photo instanceof types.ChannelForbidden)) {
        return new types.InputPhotoEmpty()
    }

    _raiseCastFail(photo, 'InputPhoto')
}

/**
 Similar to `getInputPeer`, but for chat photos.
 */
function getInputChatPhoto(photo) {
    try {
        if (photo.SUBCLASS_OF_ID === 0xd4eb2d74) {
            return photo
        } else if (photo.SUBCLASS_OF_ID === 0xe7655f1f) {
            return new types.InputChatUploadedPhoto(photo)
        }
    } catch (err) {
        _raiseCastFail(photo, 'InputChatPhoto')
    }

    photo = getInputPhoto(photo)
    if (photo instanceof types.InputPhoto) {
        return new types.InputChatPhoto(photo)
    } else if (photo instanceof types.InputPhotoEmpty) {
        return new types.InputChatPhotoEmpty()
    }

    _raiseCastFail(photo, 'InputChatPhoto')
}

/**
 Similar to `getInputPeer`, but for geo points.
 */
function getInputGeo(geo) {
    try {
        if (geo.SUBCLASS_OF_ID === 0x430d225) {
            return geo
        }
    } catch (err) {
        _raiseCastFail(geo, 'InputGeoPoint')
    }

    if (geo instanceof types.GeoPoint) {
        return new types.InputGeoPoint({
            lat: geo.lat,
            long: geo.long,
        })
    }

    if (geo instanceof types.GeoPointEmpty) {
        return new types.InputGeoPointEmpty()
    }

    if (geo instanceof types.MessageMediaGeo) {
        return getInputGeo(geo)
    }

    if (geo instanceof types.Message) {
        return getInputGeo(geo.media)
    }

    _raiseCastFail(geo, 'InputGeoPoint')
}

/**
 Similar to `getInputPeer`, but for media.

 If the media is `InputFile` and `is_photo` is known to be `True`,
 it will be treated as an `InputMediaUploadedPhoto`. Else, the rest
 of parameters will indicate how to treat it.
 */
function getInputMedia(media, {
    isPhoto = false,
    attributes = null,
    forceDocument = false,
    voiceNote = false,
    videoNote = false,
    supportsStreaming = false,
} = {}) {
    try {
        switch (media.SUBCLASS_OF_ID) {
        case 0xfaf846f4:
            return media
        case 0x846363e0:
            return new types.InputMediaPhoto(media)
        case 0xf33fdb68:
            return new types.InputMediaDocument(media)
        }
    } catch (err) {
        _raiseCastFail(media, 'InputMedia')
    }

    if (media instanceof types.MessageMediaPhoto) {
        return new types.InputMediaPhoto({
            id: getInputPhoto(media.photo),
            ttlSeconds: media.ttlSeconds,
        })
    }

    if ((media instanceof types.Photo) ||
        (media instanceof types.photos.Photo) ||
        (media instanceof types.PhotoEmpty)) {
        return new types.InputMediaPhoto({
            id: getInputPhoto(media),
        })
    }

    if (media instanceof types.MessageMediaDocument) {
        return new types.InputMediaDocument({
            id: getInputDocument(media.document),
            ttlSeconds: media.ttlSeconds,
        })
    }

    if ((media instanceof types.Document) ||
        (media instanceof types.DocumentEmpty)) {
        return new types.InputMediaDocument({
            id: getInputDocument(media),
        })
    }

    if ((media instanceof types.InputFile) ||
        (media instanceof types.InputFileBig)) {
        // eslint-disable-next-line one-var
        if (isPhoto) {
            return new types.InputMediaUploadedPhoto({
                file: media,
            })
        } else {
            // TODO: Get attributes from audio file
            // [attrs, mimeType] = getAttributes(media, {
            //     attributes,
            //     forceDocument,
            //     voiceNote,
            //     videoNote,
            //     supportsStreaming,
            // })
            const mimeType = mime.lookup(media.name)
            return new types.InputMediaUploadedDocument({
                file: media,
                mimeType: mimeType,
                attributes: [],
            })
        }
    }

    if (media instanceof types.MessageMediaGame) {
        return new types.InputMediaGame({
            id: media.game.id,
        })
    }

    if (media instanceof types.MessageMediaContact) {
        return new types.InputMediaContact({
            phoneNumber: media.phoneNumber,
            firstName: media.firstName,
            lastName: media.lastName,
            vcard: '',
        })
    }

    if (media instanceof types.MessageMediaGeo) {
        return new types.InputMediaGeoPoint({
            geoPoint: getInputGeo(media.geo),
        })
    }

    if (media instanceof types.MessageMediaVenue) {
        return new types.InputMediaVenue({
            geoPoint: getInputGeo(media.geo),
            title: media.title,
            address: media.address,
            provider: media.provider,
            venueId: media.venueId,
            venueType: '',
        })
    }

    if ((media instanceof types.MessageMediaEmpty) ||
        (media instanceof types.MessageMediaUnsupported) ||
        (media instanceof types.ChatPhotoEmpty) ||
        (media instanceof types.UserProfilePhoto) ||
        (media instanceof types.FileLocationToBeDeprecated)) {
        return new types.InputMediaEmpty()
    }

    if (media instanceof types.Message) {
        return getInputMedia(media.media, {
            isPhoto,
        })
    }

    _raiseCastFail(media, 'InputMedia')
}

function getPeer(peer) {
    try {
        if (typeof peer === 'number') {
            const res = resolveId(peer)

            if (res[1] === types.PeerChannel) {
                return new res[1]({
                    channelId: res[0],
                })
            } else if (res[1] === types.PeerChat) {
                return new res[1]({
                    chatId: res[0],
                })
            } else {
                return new res[1]({
                    userId: res[0],
                })
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
            return new types.PeerChannel({
                channelId: peer.id,
            })
        }
        if (peer.SUBCLASS_OF_ID === 0x7d7c6f86 || peer.SUBCLASS_OF_ID === 0xd9c7fc18) {
            // ChatParticipant, ChannelParticipant
            return new types.PeerUser({
                userId: peer.userId,
            })
        }
        peer = getInputPeer(peer, false, false)

        if (peer instanceof types.InputPeerUser) {
            return new types.PeerUser({
                userId: peer.userId,
            })
        } else if (peer instanceof types.InputPeerChat) {
            return new types.PeerChat({
                chatId: peer.chatId,
            })
        } else if (peer instanceof types.InputPeerChannel) {
            return new types.PeerChannel({
                channelId: peer.channelId,
            })
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
    return {
        entity,
        inputEntity,
    }
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
 Converts the given parse mode into an object with
 `parse` and `unparse` callable properties.
 */
function sanitizeParseMode(mode) {
    if (!mode) return null

    if (mode instanceof Function) {
        class CustomMode {
            static unparse(text, entities) {
                throw new Error('Not implemented')
            }
        }

        CustomMode.prototype.parse = mode
        return CustomMode
    } else if (mode.parse && mode.unparse) {
        return mode
    } else if (mode instanceof String) {
        switch (mode.toLowerCase()) {
        case 'md':
        case 'markdown':
            return markdown
        case 'htm':
        case 'html':
            return html
        default:
            throw new Error(`Unknown parse mode ${mode}`)
        }
    } else {
        throw new TypeError(`Invalid parse mode type ${mode}`)
    }
}


function _getFileInfo(location) {
    try {
        if (location.SUBCLASS_OF_ID === 0x1523d462) {
            return new FileInfo(null, location, null)
        }
    } catch (err) {
        _raiseCastFail(location, 'InputFileLocation')
    }

    if (location instanceof types.Message) {
        location = location.media
    }

    if (location instanceof types.MessageMediaDocument) {
        location = location.document
    } else if (location instanceof types.MessageMediaPhoto) {
        location = location.photo
    }

    if (location instanceof types.Document) {
        return new FileInfo(location.dcId, new types.InputDocumentFileLocation({
            id: location.id,
            accessHash: location.accessHash,
            fileReference: location.fileReference,
            thumbSize: '',
        }), location.size)
    } else if (location instanceof types.Photo) {
        return new FileInfo(location.dcId, new types.InputPhotoFileLocation({
            id: location.id,
            accessHash: location.accessHash,
            fileReference: location.fileReference,
            thumbSize: location.sizes.slice(-1)[0].type,
        }))
    }

    if (location instanceof types.FileLocationToBeDeprecated) {
        throw new TypeError('Unavailable location can\'t be used as input')
    }

    _raiseCastFail(location, 'InputFileLocation')
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

function isImage(file) {
    if (path.extname(file).match(/\.(png|jpe?g)/i)) {
        return true
    } else {
        return resolveBotFileId(file) instanceof types.Photo
    }
}

function isGif(file) {
    return !!(path.extname(file).match(/\.gif/i))
}

function isAudio(file) {
    return (mime.lookup(file) || '').startsWith('audio/')
}

function isVideo(file) {
    return (mime.lookup(file) || '').startsWith('video/')
}

function isIterable(obj) {
    if (obj == null) {
        return false
    }
    return typeof obj[Symbol.iterator] === 'function'
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
            return {
                username: username,
                isInvite: true,
            }
        } else {
            username = rtrim(username, '/')
        }
    }
    if (username.match(VALID_USERNAME_RE)) {
        return {
            username: username.toLowerCase(),
            isInvite: false,
        }
    } else {
        return {
            username: null,
            isInvite: false,
        }
    }
}

/**
 Gets the inner text that's surrounded by the given entites.
 For instance: `text = 'Hey!', entity = new MessageEntityBold(2, 2) // -> 'y!'`

 @param text the original text
 @param entities the entity or entities that must be matched
 */
function getInnerText(text, entities) {
    entities = Array.isArray(entities) ? entities : [entities]
    return entities.reduce((acc, e) => {
        const start = e.offset
        const stop = e.offset + e.length
        acc.push(text.substring(start, stop))
        return acc
    }, [])
}

function rtrim(s, mask) {
    while (~mask.indexOf(s[s.length - 1])) {
        s = s.slice(0, -1)
    }
    return s
}

/**
 Decoded run-length-encoded data
 */
function _rleDecode(data) {
    return data.replace(/(\d+)([A-z\s])/g, (_, runLength, char) => char.repeat(runLength))
}

/**
 Run-length encodes data
 */
function _rleEncode(data) {
    return data.replace(/([A-z])\1+/g, (run, char) => (run.length + char))
}

/**
 Decodes a url-safe base64 encoded string into its bytes
 by first adding the stripped necessary padding characters.

 This is the way Telegram shares binary data as strings, such
 as the Bot API style file IDs or invite links.

 Returns `null` if the input string was not valid.
 */
function _decodeTelegramBase64(string) {
    string += '='.repeat(string.length % 4)
    return new Buffer(string).toString('utf8')
}

/**
 Inverse of `_decodeTelegramBase64`
 */
function _encodeTelegramBase64(string) {
    return new Buffer(string).toString('base64').replace(/=+$/, '')
}

/**
 Given a Bot API style `fileId`, returns the media it
 represents. If the `fileId` is not valid, `null` is
 returned instead.

 Note that the `fileId` does not have information such as
 dimensions, or file size, so these will be zero if
 present.

 For thumbnails, the photo ID hash will always be zero.
 */
function resolveBotFileId(fileId) {
    let data = _rleDecode(_decodeTelegramBase64(fileId))
    if (!data) return null

    // Not officially documented anywhere, but we
    // assume the last byte is some kind of "version".
    let version
    [data, version] = data.slice(0, data.length - 1), data.slice(-1)
    if (![2, 4].includes(version)) return null

    if ((version === 2 && data.size === 24) ||
        (version === 4 && data.size === 25)) {
        // eslint-disable-next-line one-var
        let fileType, dcId, mediaId, accessHash
        if (version === 2) {
            [fileType, dcId, mediaId, accessHash] = struct.unpack('<iiqq', Buffer.from(data))
        } else {
            // TODO: Figure out what the extra byte means
            // eslint-disable-next-line comma-dangle, comma-spacing
            [fileType, dcId, mediaId, accessHash,] = struct.unpack('<iiqqb', Buffer.from(data))
        }

        if (!((1 <= dcId) && (dcId <= 5))) {
            // Valid `fileId`'s must have valid DC IDs. Since this method is
            // called when sending a file and the user may have entered a path
            // they believe is correct but the file doesn't exist, this method
            // may detect a path as "valid" bot `fileId` even when it's not.
            // By checking the `dcId`, we greatly reduce the chances of this
            // happening.
            return null
        }

        const attributes = []
        switch (fileType) {
        case 3:
        case 9:
            attributes.push(new types.DocumentAttributeAudio({
                duration: 0,
                voice: fileType === 3,
            }))
            break
        case 4:
        case 13:
            attributes.push(new types.DocumentAttributeVideo({
                duration: 0,
                w: 0,
                h: 0,
                roundMessage: fileType === 13,
            }))
            break
        case 5:
            // No idea what this is
            break
        case 8:
            attributes.push(new types.DocumentAttributeSticker({
                alt: '',
                stickerSet: new types.InputStickerSetEmpty(),
            }))
            break
        case 10:
            attributes.push(new types.DocumentAttributeAnimated())
        }

        return new types.Document({
            id: mediaId,
            accessHash: accessHash,
            date: null,
            mimeType: '',
            size: 0,
            thumbs: null,
            dcId: dcId,
            attributes: attributes,
            file_reference: '',
        })
    } else if ((version === 2 && data.size === 44) ||
        (version === 4 && data.size === 49)) {
        // eslint-disable-next-line one-var
        let dcId, mediaId, accessHash, volumeId, localId
        if (version === 2) {
            [, dcId, mediaId, accessHash, volumeId, , localId] = struct.unpack('<iiqqqqi', Buffer.from(data))
        } else {
            // TODO: Figure out what the extra five bytes mean
            // eslint-disable-next-line comma-dangle, comma-spacing
            [, dcId, mediaId, accessHash, volumeId, , localId,] = struct.unpack('<iiqqqqi5s', Buffer.from(data))
        }

        if (!((1 <= dcId) && (dcId <= 5))) {
            return null
        }

        // Thumbnails (small) always have ID 0; otherwise size 'x'
        const photoSize = mediaId || accessHash ? 's' : 'x'
        return new types.Photo({
            id: mediaId,
            accessHash: accessHash,
            fileReference: '',
            data: null,
            sizes: [new types.PhotoSize({
                type: photoSize,
                location: new types.FileLocationToBeDeprecated({
                    volumeId: volumeId,
                    localId: localId,
                }),
                w: 0,
                h: 0,
                size: 0,
            })],
            dcId: dcId,
            hasStickers: null,
        })
    }
}

/**
 * Gets the appropriated part size when uploading or downloading files,
 * given an initial file size.
 * @param fileSize
 * @returns {Number}
 */
function getAppropriatedPartSize(fileSize) {
    if (fileSize <= 104857600) { // 100MB
        return 128
    }
    if (fileSize <= 786432000) { // 750MB
        return 256
    }
    if (fileSize <= 1572864000) { // 1500MB
        return 512
    }

    throw new Error('File size too large')
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
            typeof(item.length) === 'number' &&
            (item.length === 0 ||
                (item.length > 0 &&
                    (item.length - 1) in item)
            )
        )
    )
}

module.exports = {
    _getEntityPair,
    _decodeTelegramBase64,
    _encodeTelegramBase64,
    _rleDecode,
    _rleEncode,
    _getFileInfo,
    chunk,
    getMessageId,
    getExtension,
    getInputChatPhoto,
    getInputMedia,
    getInputMessage,
    getInputDialog,
    getInputDocument,
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
    getAppropriatedPartSize,
    getInputLocation,
    strippedPhotoToJpg,
    resolveBotFileId,
    getInnerText,
    isImage,
    isGif,
    isAudio,
    isVideo,
    isIterable,
    sanitizeParseMode,
}
