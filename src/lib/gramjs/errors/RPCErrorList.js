const { RPCError, BadRequestError, UnauthorizedError, AuthKeyError, ServerError, ForbiddenError, InvalidDCError, FloodError, TimedOutError } = require('./RPCBaseErrors');
const format = require('string-format');

class AboutTooLongError extends BadRequestError {
    constructor(args) {
        super('The provided bio is too long' + RPCError._fmtRequest(args.request));
this.message = 'The provided bio is too long' + RPCError._fmtRequest(args.request);
    }
}


class AccessTokenExpiredError extends BadRequestError {
    constructor(args) {
        super('Bot token expired' + RPCError._fmtRequest(args.request));
this.message = 'Bot token expired' + RPCError._fmtRequest(args.request);
    }
}


class AccessTokenInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided token is not valid' + RPCError._fmtRequest(args.request));
this.message = 'The provided token is not valid' + RPCError._fmtRequest(args.request);
    }
}


class ActiveUserRequiredError extends UnauthorizedError {
    constructor(args) {
        super('The method is only available to already activated users' + RPCError._fmtRequest(args.request));
this.message = 'The method is only available to already activated users' + RPCError._fmtRequest(args.request);
    }
}


class AdminsTooMuchError extends BadRequestError {
    constructor(args) {
        super('Too many admins' + RPCError._fmtRequest(args.request));
this.message = 'Too many admins' + RPCError._fmtRequest(args.request);
    }
}


class AdminRankEmojiNotAllowedError extends BadRequestError {
    constructor(args) {
        super('Emoji are not allowed in admin titles or ranks' + RPCError._fmtRequest(args.request));
this.message = 'Emoji are not allowed in admin titles or ranks' + RPCError._fmtRequest(args.request);
    }
}


class AdminRankInvalidError extends BadRequestError {
    constructor(args) {
        super('The given admin title or rank was invalid (possibly larger than 16 characters)' + RPCError._fmtRequest(args.request));
this.message = 'The given admin title or rank was invalid (possibly larger than 16 characters)' + RPCError._fmtRequest(args.request);
    }
}


class ApiIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The api_id/api_hash combination is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The api_id/api_hash combination is invalid' + RPCError._fmtRequest(args.request);
    }
}


class ApiIdPublishedFloodError extends BadRequestError {
    constructor(args) {
        super('This API id was published somewhere, you can\'t use it now' + RPCError._fmtRequest(args.request));
this.message = 'This API id was published somewhere, you can\'t use it now' + RPCError._fmtRequest(args.request);
    }
}


class ArticleTitleEmptyError extends BadRequestError {
    constructor(args) {
        super('The title of the article is empty' + RPCError._fmtRequest(args.request));
this.message = 'The title of the article is empty' + RPCError._fmtRequest(args.request);
    }
}


class AuthBytesInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided authorization is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided authorization is invalid' + RPCError._fmtRequest(args.request);
    }
}


class AuthKeyDuplicatedError extends AuthKeyError {
    constructor(args) {
        super('The authorization key (session file) was used under two different IP addresses simultaneously, and can no longer be used. Use the same session exclusively, or use different sessions' + RPCError._fmtRequest(args.request));
this.message = 'The authorization key (session file) was used under two different IP addresses simultaneously, and can no longer be used. Use the same session exclusively, or use different sessions' + RPCError._fmtRequest(args.request);
    }
}


class AuthKeyInvalidError extends UnauthorizedError {
    constructor(args) {
        super('The key is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The key is invalid' + RPCError._fmtRequest(args.request);
    }
}


class AuthKeyPermEmptyError extends UnauthorizedError {
    constructor(args) {
        super('The method is unavailable for temporary authorization key, not bound to permanent' + RPCError._fmtRequest(args.request));
this.message = 'The method is unavailable for temporary authorization key, not bound to permanent' + RPCError._fmtRequest(args.request);
    }
}


class AuthKeyUnregisteredError extends UnauthorizedError {
    constructor(args) {
        super('The key is not registered in the system' + RPCError._fmtRequest(args.request));
this.message = 'The key is not registered in the system' + RPCError._fmtRequest(args.request);
    }
}


class AuthRestartError extends ServerError {
    constructor(args) {
        super('Restart the authorization process' + RPCError._fmtRequest(args.request));
this.message = 'Restart the authorization process' + RPCError._fmtRequest(args.request);
    }
}


class BannedRightsInvalidError extends BadRequestError {
    constructor(args) {
        super('You cannot use that set of permissions in this request, i.e. restricting view_messages as a default' + RPCError._fmtRequest(args.request));
this.message = 'You cannot use that set of permissions in this request, i.e. restricting view_messages as a default' + RPCError._fmtRequest(args.request);
    }
}


class BotsTooMuchError extends BadRequestError {
    constructor(args) {
        super('There are too many bots in this chat/channel' + RPCError._fmtRequest(args.request));
this.message = 'There are too many bots in this chat/channel' + RPCError._fmtRequest(args.request);
    }
}


class BotChannelsNaError extends BadRequestError {
    constructor(args) {
        super('Bots can\'t edit admin privileges' + RPCError._fmtRequest(args.request));
this.message = 'Bots can\'t edit admin privileges' + RPCError._fmtRequest(args.request);
    }
}


class BotGroupsBlockedError extends BadRequestError {
    constructor(args) {
        super('This bot can\'t be added to groups' + RPCError._fmtRequest(args.request));
this.message = 'This bot can\'t be added to groups' + RPCError._fmtRequest(args.request);
    }
}


class BotInlineDisabledError extends BadRequestError {
    constructor(args) {
        super('This bot can\'t be used in inline mode' + RPCError._fmtRequest(args.request));
this.message = 'This bot can\'t be used in inline mode' + RPCError._fmtRequest(args.request);
    }
}


class BotInvalidError extends BadRequestError {
    constructor(args) {
        super('This is not a valid bot' + RPCError._fmtRequest(args.request));
this.message = 'This is not a valid bot' + RPCError._fmtRequest(args.request);
    }
}


class BotMethodInvalidError extends BadRequestError {
    constructor(args) {
        super('The API access for bot users is restricted. The method you tried to invoke cannot be executed as a bot' + RPCError._fmtRequest(args.request));
this.message = 'The API access for bot users is restricted. The method you tried to invoke cannot be executed as a bot' + RPCError._fmtRequest(args.request);
    }
}


class BotMissingError extends BadRequestError {
    constructor(args) {
        super('This method can only be run by a bot' + RPCError._fmtRequest(args.request));
this.message = 'This method can only be run by a bot' + RPCError._fmtRequest(args.request);
    }
}


class BotPaymentsDisabledError extends BadRequestError {
    constructor(args) {
        super('This method can only be run by a bot' + RPCError._fmtRequest(args.request));
this.message = 'This method can only be run by a bot' + RPCError._fmtRequest(args.request);
    }
}


class BotPollsDisabledError extends BadRequestError {
    constructor(args) {
        super('You cannot create polls under a bot account' + RPCError._fmtRequest(args.request));
this.message = 'You cannot create polls under a bot account' + RPCError._fmtRequest(args.request);
    }
}


class BroadcastIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The channel is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The channel is invalid' + RPCError._fmtRequest(args.request);
    }
}


class ButtonDataInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided button data is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided button data is invalid' + RPCError._fmtRequest(args.request);
    }
}


class ButtonTypeInvalidError extends BadRequestError {
    constructor(args) {
        super('The type of one of the buttons you provided is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The type of one of the buttons you provided is invalid' + RPCError._fmtRequest(args.request);
    }
}


class ButtonUrlInvalidError extends BadRequestError {
    constructor(args) {
        super('Button URL invalid' + RPCError._fmtRequest(args.request));
this.message = 'Button URL invalid' + RPCError._fmtRequest(args.request);
    }
}


class CallAlreadyAcceptedError extends BadRequestError {
    constructor(args) {
        super('The call was already accepted' + RPCError._fmtRequest(args.request));
this.message = 'The call was already accepted' + RPCError._fmtRequest(args.request);
    }
}


class CallAlreadyDeclinedError extends BadRequestError {
    constructor(args) {
        super('The call was already declined' + RPCError._fmtRequest(args.request));
this.message = 'The call was already declined' + RPCError._fmtRequest(args.request);
    }
}


class CallOccupyFailedError extends ServerError {
    constructor(args) {
        super('The call failed because the user is already making another call' + RPCError._fmtRequest(args.request));
this.message = 'The call failed because the user is already making another call' + RPCError._fmtRequest(args.request);
    }
}


class CallPeerInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided call peer object is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided call peer object is invalid' + RPCError._fmtRequest(args.request);
    }
}


class CallProtocolFlagsInvalidError extends BadRequestError {
    constructor(args) {
        super('Call protocol flags invalid' + RPCError._fmtRequest(args.request));
this.message = 'Call protocol flags invalid' + RPCError._fmtRequest(args.request);
    }
}


class CdnMethodInvalidError extends BadRequestError {
    constructor(args) {
        super('This method cannot be invoked on a CDN server. Refer to https://core.telegram.org/cdn#schema for available methods' + RPCError._fmtRequest(args.request));
this.message = 'This method cannot be invoked on a CDN server. Refer to https://core.telegram.org/cdn#schema for available methods' + RPCError._fmtRequest(args.request);
    }
}


class ChannelsAdminPublicTooMuchError extends BadRequestError {
    constructor(args) {
        super('You\'re admin of too many public channels, make some channels private to change the username of this channel' + RPCError._fmtRequest(args.request));
this.message = 'You\'re admin of too many public channels, make some channels private to change the username of this channel' + RPCError._fmtRequest(args.request);
    }
}


class ChannelsTooMuchError extends BadRequestError {
    constructor(args) {
        super('You have joined too many channels/supergroups' + RPCError._fmtRequest(args.request));
this.message = 'You have joined too many channels/supergroups' + RPCError._fmtRequest(args.request);
    }
}


class ChannelInvalidError extends BadRequestError {
    constructor(args) {
        super('Invalid channel object. Make sure to pass the right types, for instance making sure that the request is designed for channels or otherwise look for a different one more suited' + RPCError._fmtRequest(args.request));
this.message = 'Invalid channel object. Make sure to pass the right types, for instance making sure that the request is designed for channels or otherwise look for a different one more suited' + RPCError._fmtRequest(args.request);
    }
}


class ChannelPrivateError extends BadRequestError {
    constructor(args) {
        super('The channel specified is private and you lack permission to access it. Another reason may be that you were banned from it' + RPCError._fmtRequest(args.request));
this.message = 'The channel specified is private and you lack permission to access it. Another reason may be that you were banned from it' + RPCError._fmtRequest(args.request);
    }
}


class ChannelPublicGroupNaError extends ForbiddenError {
    constructor(args) {
        super('channel/supergroup not available' + RPCError._fmtRequest(args.request));
this.message = 'channel/supergroup not available' + RPCError._fmtRequest(args.request);
    }
}


class ChatAboutNotModifiedError extends BadRequestError {
    constructor(args) {
        super('About text has not changed' + RPCError._fmtRequest(args.request));
this.message = 'About text has not changed' + RPCError._fmtRequest(args.request);
    }
}


class ChatAboutTooLongError extends BadRequestError {
    constructor(args) {
        super('Chat about too long' + RPCError._fmtRequest(args.request));
this.message = 'Chat about too long' + RPCError._fmtRequest(args.request);
    }
}


class ChatAdminInviteRequiredError extends ForbiddenError {
    constructor(args) {
        super('You do not have the rights to do this' + RPCError._fmtRequest(args.request));
this.message = 'You do not have the rights to do this' + RPCError._fmtRequest(args.request);
    }
}


class ChatAdminRequiredError extends BadRequestError {
    constructor(args) {
        super('Chat admin privileges are required to do that in the specified chat (for example, to send a message in a channel which is not yours), or invalid permissions used for the channel or group' + RPCError._fmtRequest(args.request));
this.message = 'Chat admin privileges are required to do that in the specified chat (for example, to send a message in a channel which is not yours), or invalid permissions used for the channel or group' + RPCError._fmtRequest(args.request);
    }
}


class ChatForbiddenError extends BadRequestError {
    constructor(args) {
        super('You cannot write in this chat' + RPCError._fmtRequest(args.request));
this.message = 'You cannot write in this chat' + RPCError._fmtRequest(args.request);
    }
}


class ChatIdEmptyError extends BadRequestError {
    constructor(args) {
        super('The provided chat ID is empty' + RPCError._fmtRequest(args.request));
this.message = 'The provided chat ID is empty' + RPCError._fmtRequest(args.request);
    }
}


class ChatIdInvalidError extends BadRequestError {
    constructor(args) {
        super('Invalid object ID for a chat. Make sure to pass the right types, for instance making sure that the request is designed for chats (not channels/megagroups) or otherwise look for a different one more suited\nAn example working with a megagroup and AddChatUserRequest, it will fail because megagroups are channels. Use InviteToChannelRequest instead' + RPCError._fmtRequest(args.request));
this.message = 'Invalid object ID for a chat. Make sure to pass the right types, for instance making sure that the request is designed for chats (not channels/megagroups) or otherwise look for a different one more suited\nAn example working with a megagroup and AddChatUserRequest, it will fail because megagroups are channels. Use InviteToChannelRequest instead' + RPCError._fmtRequest(args.request);
    }
}


class ChatInvalidError extends BadRequestError {
    constructor(args) {
        super('The chat is invalid for this request' + RPCError._fmtRequest(args.request));
this.message = 'The chat is invalid for this request' + RPCError._fmtRequest(args.request);
    }
}


class ChatLinkExistsError extends BadRequestError {
    constructor(args) {
        super('The chat is linked to a channel and cannot be used in that request' + RPCError._fmtRequest(args.request));
this.message = 'The chat is linked to a channel and cannot be used in that request' + RPCError._fmtRequest(args.request);
    }
}


class ChatNotModifiedError extends BadRequestError {
    constructor(args) {
        super('The chat or channel wasn\'t modified (title, invites, username, admins, etc. are the same)' + RPCError._fmtRequest(args.request));
this.message = 'The chat or channel wasn\'t modified (title, invites, username, admins, etc. are the same)' + RPCError._fmtRequest(args.request);
    }
}


class ChatRestrictedError extends BadRequestError {
    constructor(args) {
        super('The chat is restricted and cannot be used in that request' + RPCError._fmtRequest(args.request));
this.message = 'The chat is restricted and cannot be used in that request' + RPCError._fmtRequest(args.request);
    }
}


class ChatSendGifsForbiddenError extends ForbiddenError {
    constructor(args) {
        super('You can\'t send gifs in this chat' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t send gifs in this chat' + RPCError._fmtRequest(args.request);
    }
}


class ChatSendInlineForbiddenError extends BadRequestError {
    constructor(args) {
        super('You cannot send inline results in this chat' + RPCError._fmtRequest(args.request));
this.message = 'You cannot send inline results in this chat' + RPCError._fmtRequest(args.request);
    }
}


class ChatSendMediaForbiddenError extends ForbiddenError {
    constructor(args) {
        super('You can\'t send media in this chat' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t send media in this chat' + RPCError._fmtRequest(args.request);
    }
}


class ChatSendStickersForbiddenError extends ForbiddenError {
    constructor(args) {
        super('You can\'t send stickers in this chat' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t send stickers in this chat' + RPCError._fmtRequest(args.request);
    }
}


class ChatTitleEmptyError extends BadRequestError {
    constructor(args) {
        super('No chat title provided' + RPCError._fmtRequest(args.request));
this.message = 'No chat title provided' + RPCError._fmtRequest(args.request);
    }
}


class ChatWriteForbiddenError extends ForbiddenError {
    constructor(args) {
        super('You can\'t write in this chat' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t write in this chat' + RPCError._fmtRequest(args.request);
    }
}


class CodeEmptyError extends BadRequestError {
    constructor(args) {
        super('The provided code is empty' + RPCError._fmtRequest(args.request));
this.message = 'The provided code is empty' + RPCError._fmtRequest(args.request);
    }
}


class CodeHashInvalidError extends BadRequestError {
    constructor(args) {
        super('Code hash invalid' + RPCError._fmtRequest(args.request));
this.message = 'Code hash invalid' + RPCError._fmtRequest(args.request);
    }
}


class CodeInvalidError extends BadRequestError {
    constructor(args) {
        super('Code invalid (i.e. from email)' + RPCError._fmtRequest(args.request));
this.message = 'Code invalid (i.e. from email)' + RPCError._fmtRequest(args.request);
    }
}


class ConnectionApiIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided API id is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided API id is invalid' + RPCError._fmtRequest(args.request);
    }
}


class ConnectionDeviceModelEmptyError extends BadRequestError {
    constructor(args) {
        super('Device model empty' + RPCError._fmtRequest(args.request));
this.message = 'Device model empty' + RPCError._fmtRequest(args.request);
    }
}


class ConnectionLangPackInvalidError extends BadRequestError {
    constructor(args) {
        super('The specified language pack is not valid. This is meant to be used by official applications only so far, leave it empty' + RPCError._fmtRequest(args.request));
this.message = 'The specified language pack is not valid. This is meant to be used by official applications only so far, leave it empty' + RPCError._fmtRequest(args.request);
    }
}


class ConnectionLayerInvalidError extends BadRequestError {
    constructor(args) {
        super('The very first request must always be InvokeWithLayerRequest' + RPCError._fmtRequest(args.request));
this.message = 'The very first request must always be InvokeWithLayerRequest' + RPCError._fmtRequest(args.request);
    }
}


class ConnectionNotInitedError extends BadRequestError {
    constructor(args) {
        super('Connection not initialized' + RPCError._fmtRequest(args.request));
this.message = 'Connection not initialized' + RPCError._fmtRequest(args.request);
    }
}


class ConnectionSystemEmptyError extends BadRequestError {
    constructor(args) {
        super('Connection system empty' + RPCError._fmtRequest(args.request));
this.message = 'Connection system empty' + RPCError._fmtRequest(args.request);
    }
}


class ContactIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided contact ID is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided contact ID is invalid' + RPCError._fmtRequest(args.request);
    }
}


class DataInvalidError extends BadRequestError {
    constructor(args) {
        super('Encrypted data invalid' + RPCError._fmtRequest(args.request));
this.message = 'Encrypted data invalid' + RPCError._fmtRequest(args.request);
    }
}


class DataJsonInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided JSON data is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided JSON data is invalid' + RPCError._fmtRequest(args.request);
    }
}


class DateEmptyError extends BadRequestError {
    constructor(args) {
        super('Date empty' + RPCError._fmtRequest(args.request));
this.message = 'Date empty' + RPCError._fmtRequest(args.request);
    }
}


class DcIdInvalidError extends BadRequestError {
    constructor(args) {
        super('This occurs when an authorization is tried to be exported for the same data center one is currently connected to' + RPCError._fmtRequest(args.request));
this.message = 'This occurs when an authorization is tried to be exported for the same data center one is currently connected to' + RPCError._fmtRequest(args.request);
    }
}


class DhGAInvalidError extends BadRequestError {
    constructor(args) {
        super('g_a invalid' + RPCError._fmtRequest(args.request));
this.message = 'g_a invalid' + RPCError._fmtRequest(args.request);
    }
}


class EmailHashExpiredError extends BadRequestError {
    constructor(args) {
        super('The email hash expired and cannot be used to verify it' + RPCError._fmtRequest(args.request));
this.message = 'The email hash expired and cannot be used to verify it' + RPCError._fmtRequest(args.request);
    }
}


class EmailInvalidError extends BadRequestError {
    constructor(args) {
        super('The given email is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The given email is invalid' + RPCError._fmtRequest(args.request);
    }
}


class EmailUnconfirmedError extends BadRequestError {
    constructor(args) {
        const codeLength = Number(args.capture || 0);
        super(format('Email unconfirmed, the length of the code must be {code_length}', {codeLength}) + RPCError._fmtRequest(args.request));
this.message = format('Email unconfirmed, the length of the code must be {code_length}', {codeLength}) + RPCError._fmtRequest(args.request);
        this.codeLength = codeLength;
    }
}


class EmoticonEmptyError extends BadRequestError {
    constructor(args) {
        super('The emoticon field cannot be empty' + RPCError._fmtRequest(args.request));
this.message = 'The emoticon field cannot be empty' + RPCError._fmtRequest(args.request);
    }
}


class EncryptedMessageInvalidError extends BadRequestError {
    constructor(args) {
        super('Encrypted message invalid' + RPCError._fmtRequest(args.request));
this.message = 'Encrypted message invalid' + RPCError._fmtRequest(args.request);
    }
}


class EncryptionAlreadyAcceptedError extends BadRequestError {
    constructor(args) {
        super('Secret chat already accepted' + RPCError._fmtRequest(args.request));
this.message = 'Secret chat already accepted' + RPCError._fmtRequest(args.request);
    }
}


class EncryptionAlreadyDeclinedError extends BadRequestError {
    constructor(args) {
        super('The secret chat was already declined' + RPCError._fmtRequest(args.request));
this.message = 'The secret chat was already declined' + RPCError._fmtRequest(args.request);
    }
}


class EncryptionDeclinedError extends BadRequestError {
    constructor(args) {
        super('The secret chat was declined' + RPCError._fmtRequest(args.request));
this.message = 'The secret chat was declined' + RPCError._fmtRequest(args.request);
    }
}


class EncryptionIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided secret chat ID is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided secret chat ID is invalid' + RPCError._fmtRequest(args.request);
    }
}


class EncryptionOccupyFailedError extends ServerError {
    constructor(args) {
        super('TDLib developer claimed it is not an error while accepting secret chats and 500 is used instead of 420' + RPCError._fmtRequest(args.request));
this.message = 'TDLib developer claimed it is not an error while accepting secret chats and 500 is used instead of 420' + RPCError._fmtRequest(args.request);
    }
}


class EntitiesTooLongError extends BadRequestError {
    constructor(args) {
        super('It is no longer possible to send such long data inside entity tags (for example inline text URLs)' + RPCError._fmtRequest(args.request));
this.message = 'It is no longer possible to send such long data inside entity tags (for example inline text URLs)' + RPCError._fmtRequest(args.request);
    }
}


class EntityMentionUserInvalidError extends BadRequestError {
    constructor(args) {
        super('You can\'t use this entity' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t use this entity' + RPCError._fmtRequest(args.request);
    }
}


class ErrorTextEmptyError extends BadRequestError {
    constructor(args) {
        super('The provided error message is empty' + RPCError._fmtRequest(args.request));
this.message = 'The provided error message is empty' + RPCError._fmtRequest(args.request);
    }
}


class ExportCardInvalidError extends BadRequestError {
    constructor(args) {
        super('Provided card is invalid' + RPCError._fmtRequest(args.request));
this.message = 'Provided card is invalid' + RPCError._fmtRequest(args.request);
    }
}


class ExternalUrlInvalidError extends BadRequestError {
    constructor(args) {
        super('External URL invalid' + RPCError._fmtRequest(args.request));
this.message = 'External URL invalid' + RPCError._fmtRequest(args.request);
    }
}


class FieldNameEmptyError extends BadRequestError {
    constructor(args) {
        super('The field with the name FIELD_NAME is missing' + RPCError._fmtRequest(args.request));
this.message = 'The field with the name FIELD_NAME is missing' + RPCError._fmtRequest(args.request);
    }
}


class FieldNameInvalidError extends BadRequestError {
    constructor(args) {
        super('The field with the name FIELD_NAME is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The field with the name FIELD_NAME is invalid' + RPCError._fmtRequest(args.request);
    }
}


class FileIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided file id is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided file id is invalid' + RPCError._fmtRequest(args.request);
    }
}


class FileMigrateError extends InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(format('The file to be accessed is currently stored in DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request));
this.message = format('The file to be accessed is currently stored in DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}


class FilePartsInvalidError extends BadRequestError {
    constructor(args) {
        super('The number of file parts is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The number of file parts is invalid' + RPCError._fmtRequest(args.request);
    }
}


class FilePart0MissingError extends BadRequestError {
    constructor(args) {
        super('File part 0 missing' + RPCError._fmtRequest(args.request));
this.message = 'File part 0 missing' + RPCError._fmtRequest(args.request);
    }
}


class FilePartEmptyError extends BadRequestError {
    constructor(args) {
        super('The provided file part is empty' + RPCError._fmtRequest(args.request));
this.message = 'The provided file part is empty' + RPCError._fmtRequest(args.request);
    }
}


class FilePartInvalidError extends BadRequestError {
    constructor(args) {
        super('The file part number is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The file part number is invalid' + RPCError._fmtRequest(args.request);
    }
}


class FilePartLengthInvalidError extends BadRequestError {
    constructor(args) {
        super('The length of a file part is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The length of a file part is invalid' + RPCError._fmtRequest(args.request);
    }
}


class FilePartSizeInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided file part size is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided file part size is invalid' + RPCError._fmtRequest(args.request);
    }
}


class FilePartMissingError extends BadRequestError {
    constructor(args) {
        const which = Number(args.capture || 0);
        super(format('Part {which} of the file is missing from storage', {which}) + RPCError._fmtRequest(args.request));
this.message = format('Part {which} of the file is missing from storage', {which}) + RPCError._fmtRequest(args.request);
        this.which = which;
    }
}


class FilerefUpgradeNeededError extends AuthKeyError {
    constructor(args) {
        super('The file reference needs to be refreshed before being used again' + RPCError._fmtRequest(args.request));
this.message = 'The file reference needs to be refreshed before being used again' + RPCError._fmtRequest(args.request);
    }
}


class FirstNameInvalidError extends BadRequestError {
    constructor(args) {
        super('The first name is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The first name is invalid' + RPCError._fmtRequest(args.request);
    }
}


class FloodTestPhoneWaitError extends FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0);
        super(format('A wait of {seconds} seconds is required in the test servers', {seconds}) + RPCError._fmtRequest(args.request));
this.message = format('A wait of {seconds} seconds is required in the test servers', {seconds}) + RPCError._fmtRequest(args.request);
        this.seconds = seconds;
    }
}


class FloodWaitError extends FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0);
        super(format('A wait of {seconds} seconds is required', {seconds}) + RPCError._fmtRequest(args.request));
this.message = format('A wait of {seconds} seconds is required', {seconds}) + RPCError._fmtRequest(args.request);
        this.seconds = seconds;
    }
}


class FolderIdEmptyError extends BadRequestError {
    constructor(args) {
        super('The folder you tried to delete was already empty' + RPCError._fmtRequest(args.request));
this.message = 'The folder you tried to delete was already empty' + RPCError._fmtRequest(args.request);
    }
}


class FolderIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The folder you tried to use was not valid' + RPCError._fmtRequest(args.request));
this.message = 'The folder you tried to use was not valid' + RPCError._fmtRequest(args.request);
    }
}


class FreshResetAuthorisationForbiddenError extends AuthKeyError {
    constructor(args) {
        super('The current session is too new and cannot be used to reset other authorisations yet' + RPCError._fmtRequest(args.request));
this.message = 'The current session is too new and cannot be used to reset other authorisations yet' + RPCError._fmtRequest(args.request);
    }
}


class GifIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided GIF ID is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided GIF ID is invalid' + RPCError._fmtRequest(args.request);
    }
}


class GroupedMediaInvalidError extends BadRequestError {
    constructor(args) {
        super('Invalid grouped media' + RPCError._fmtRequest(args.request));
this.message = 'Invalid grouped media' + RPCError._fmtRequest(args.request);
    }
}


class HashInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided hash is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided hash is invalid' + RPCError._fmtRequest(args.request);
    }
}


class HistoryGetFailedError extends ServerError {
    constructor(args) {
        super('Fetching of history failed' + RPCError._fmtRequest(args.request));
this.message = 'Fetching of history failed' + RPCError._fmtRequest(args.request);
    }
}


class ImageProcessFailedError extends BadRequestError {
    constructor(args) {
        super('Failure while processing image' + RPCError._fmtRequest(args.request));
this.message = 'Failure while processing image' + RPCError._fmtRequest(args.request);
    }
}


class InlineResultExpiredError extends BadRequestError {
    constructor(args) {
        super('The inline query expired' + RPCError._fmtRequest(args.request));
this.message = 'The inline query expired' + RPCError._fmtRequest(args.request);
    }
}


class InputConstructorInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided constructor is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided constructor is invalid' + RPCError._fmtRequest(args.request);
    }
}


class InputFetchErrorError extends BadRequestError {
    constructor(args) {
        super('An error occurred while deserializing TL parameters' + RPCError._fmtRequest(args.request));
this.message = 'An error occurred while deserializing TL parameters' + RPCError._fmtRequest(args.request);
    }
}


class InputFetchFailError extends BadRequestError {
    constructor(args) {
        super('Failed deserializing TL payload' + RPCError._fmtRequest(args.request));
this.message = 'Failed deserializing TL payload' + RPCError._fmtRequest(args.request);
    }
}


class InputLayerInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided layer is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided layer is invalid' + RPCError._fmtRequest(args.request);
    }
}


class InputMethodInvalidError extends BadRequestError {
    constructor(args) {
        super('The invoked method does not exist anymore or has never existed' + RPCError._fmtRequest(args.request));
this.message = 'The invoked method does not exist anymore or has never existed' + RPCError._fmtRequest(args.request);
    }
}


class InputRequestTooLongError extends BadRequestError {
    constructor(args) {
        super('The input request was too long. This may be a bug in the library as it can occur when serializing more bytes than it should (like appending the vector constructor code at the end of a message)' + RPCError._fmtRequest(args.request));
this.message = 'The input request was too long. This may be a bug in the library as it can occur when serializing more bytes than it should (like appending the vector constructor code at the end of a message)' + RPCError._fmtRequest(args.request);
    }
}


class InputUserDeactivatedError extends BadRequestError {
    constructor(args) {
        super('The specified user was deleted' + RPCError._fmtRequest(args.request));
this.message = 'The specified user was deleted' + RPCError._fmtRequest(args.request);
    }
}


class InterdcCallErrorError extends BadRequestError {
    constructor(args) {
        const dc = Number(args.capture || 0);
        super(format('An error occurred while communicating with DC {dc}', {dc}) + RPCError._fmtRequest(args.request));
this.message = format('An error occurred while communicating with DC {dc}', {dc}) + RPCError._fmtRequest(args.request);
        this.dc = dc;
    }
}


class InterdcCallRichErrorError extends BadRequestError {
    constructor(args) {
        const dc = Number(args.capture || 0);
        super(format('A rich error occurred while communicating with DC {dc}', {dc}) + RPCError._fmtRequest(args.request));
this.message = format('A rich error occurred while communicating with DC {dc}', {dc}) + RPCError._fmtRequest(args.request);
        this.dc = dc;
    }
}


class InviteHashEmptyError extends BadRequestError {
    constructor(args) {
        super('The invite hash is empty' + RPCError._fmtRequest(args.request));
this.message = 'The invite hash is empty' + RPCError._fmtRequest(args.request);
    }
}


class InviteHashExpiredError extends BadRequestError {
    constructor(args) {
        super('The chat the user tried to join has expired and is not valid anymore' + RPCError._fmtRequest(args.request));
this.message = 'The chat the user tried to join has expired and is not valid anymore' + RPCError._fmtRequest(args.request);
    }
}


class InviteHashInvalidError extends BadRequestError {
    constructor(args) {
        super('The invite hash is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The invite hash is invalid' + RPCError._fmtRequest(args.request);
    }
}


class LangPackInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided language pack is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided language pack is invalid' + RPCError._fmtRequest(args.request);
    }
}


class LastnameInvalidError extends BadRequestError {
    constructor(args) {
        super('The last name is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The last name is invalid' + RPCError._fmtRequest(args.request);
    }
}


class LimitInvalidError extends BadRequestError {
    constructor(args) {
        super('An invalid limit was provided. See https://core.telegram.org/api/files#downloading-files' + RPCError._fmtRequest(args.request));
this.message = 'An invalid limit was provided. See https://core.telegram.org/api/files#downloading-files' + RPCError._fmtRequest(args.request);
    }
}


class LinkNotModifiedError extends BadRequestError {
    constructor(args) {
        super('The channel is already linked to this group' + RPCError._fmtRequest(args.request));
this.message = 'The channel is already linked to this group' + RPCError._fmtRequest(args.request);
    }
}


class LocationInvalidError extends BadRequestError {
    constructor(args) {
        super('The location given for a file was invalid. See https://core.telegram.org/api/files#downloading-files' + RPCError._fmtRequest(args.request));
this.message = 'The location given for a file was invalid. See https://core.telegram.org/api/files#downloading-files' + RPCError._fmtRequest(args.request);
    }
}


class MaxIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided max ID is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided max ID is invalid' + RPCError._fmtRequest(args.request);
    }
}


class MaxQtsInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided QTS were invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided QTS were invalid' + RPCError._fmtRequest(args.request);
    }
}


class Md5ChecksumInvalidError extends BadRequestError {
    constructor(args) {
        super('The MD5 check-sums do not match' + RPCError._fmtRequest(args.request));
this.message = 'The MD5 check-sums do not match' + RPCError._fmtRequest(args.request);
    }
}


class MediaCaptionTooLongError extends BadRequestError {
    constructor(args) {
        super('The caption is too long' + RPCError._fmtRequest(args.request));
this.message = 'The caption is too long' + RPCError._fmtRequest(args.request);
    }
}


class MediaEmptyError extends BadRequestError {
    constructor(args) {
        super('The provided media object is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided media object is invalid' + RPCError._fmtRequest(args.request);
    }
}


class MediaInvalidError extends BadRequestError {
    constructor(args) {
        super('Media invalid' + RPCError._fmtRequest(args.request));
this.message = 'Media invalid' + RPCError._fmtRequest(args.request);
    }
}


class MediaNewInvalidError extends BadRequestError {
    constructor(args) {
        super('The new media to edit the message with is invalid (such as stickers or voice notes)' + RPCError._fmtRequest(args.request));
this.message = 'The new media to edit the message with is invalid (such as stickers or voice notes)' + RPCError._fmtRequest(args.request);
    }
}


class MediaPrevInvalidError extends BadRequestError {
    constructor(args) {
        super('The old media cannot be edited with anything else (such as stickers or voice notes)' + RPCError._fmtRequest(args.request));
this.message = 'The old media cannot be edited with anything else (such as stickers or voice notes)' + RPCError._fmtRequest(args.request);
    }
}


class MegagroupIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The group is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The group is invalid' + RPCError._fmtRequest(args.request);
    }
}


class MegagroupPrehistoryHiddenError extends BadRequestError {
    constructor(args) {
        super('You can\'t set this discussion group because it\'s history is hidden' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t set this discussion group because it\'s history is hidden' + RPCError._fmtRequest(args.request);
    }
}


class MemberNoLocationError extends ServerError {
    constructor(args) {
        super('An internal failure occurred while fetching user info (couldn\'t find location)' + RPCError._fmtRequest(args.request));
this.message = 'An internal failure occurred while fetching user info (couldn\'t find location)' + RPCError._fmtRequest(args.request);
    }
}


class MemberOccupyPrimaryLocFailedError extends ServerError {
    constructor(args) {
        super('Occupation of primary member location failed' + RPCError._fmtRequest(args.request));
this.message = 'Occupation of primary member location failed' + RPCError._fmtRequest(args.request);
    }
}


class MessageAuthorRequiredError extends ForbiddenError {
    constructor(args) {
        super('Message author required' + RPCError._fmtRequest(args.request));
this.message = 'Message author required' + RPCError._fmtRequest(args.request);
    }
}


class MessageDeleteForbiddenError extends ForbiddenError {
    constructor(args) {
        super('You can\'t delete one of the messages you tried to delete, most likely because it is a service message.' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t delete one of the messages you tried to delete, most likely because it is a service message.' + RPCError._fmtRequest(args.request);
    }
}


class MessageEditTimeExpiredError extends BadRequestError {
    constructor(args) {
        super('You can\'t edit this message anymore, too much time has passed since its creation.' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t edit this message anymore, too much time has passed since its creation.' + RPCError._fmtRequest(args.request);
    }
}


class MessageEmptyError extends BadRequestError {
    constructor(args) {
        super('Empty or invalid UTF-8 message was sent' + RPCError._fmtRequest(args.request));
this.message = 'Empty or invalid UTF-8 message was sent' + RPCError._fmtRequest(args.request);
    }
}


class MessageIdsEmptyError extends BadRequestError {
    constructor(args) {
        super('No message ids were provided' + RPCError._fmtRequest(args.request));
this.message = 'No message ids were provided' + RPCError._fmtRequest(args.request);
    }
}


class MessageIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The specified message ID is invalid or you can\'t do that operation on such message' + RPCError._fmtRequest(args.request));
this.message = 'The specified message ID is invalid or you can\'t do that operation on such message' + RPCError._fmtRequest(args.request);
    }
}


class MessageNotModifiedError extends BadRequestError {
    constructor(args) {
        super('Content of the message was not modified' + RPCError._fmtRequest(args.request));
this.message = 'Content of the message was not modified' + RPCError._fmtRequest(args.request);
    }
}


class MessageTooLongError extends BadRequestError {
    constructor(args) {
        super('Message was too long. Current maximum length is 4096 UTF-8 characters' + RPCError._fmtRequest(args.request));
this.message = 'Message was too long. Current maximum length is 4096 UTF-8 characters' + RPCError._fmtRequest(args.request);
    }
}


class MsgWaitFailedError extends BadRequestError {
    constructor(args) {
        super('A waiting call returned an error' + RPCError._fmtRequest(args.request));
this.message = 'A waiting call returned an error' + RPCError._fmtRequest(args.request);
    }
}


class MtSendQueueTooLongError extends ServerError {
    constructor(args) {
        super('' + RPCError._fmtRequest(args.request));
this.message = '' + RPCError._fmtRequest(args.request);
    }
}


class NeedChatInvalidError extends ServerError {
    constructor(args) {
        super('The provided chat is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided chat is invalid' + RPCError._fmtRequest(args.request);
    }
}


class NeedMemberInvalidError extends ServerError {
    constructor(args) {
        super('The provided member is invalid or does not exist (for example a thumb size)' + RPCError._fmtRequest(args.request));
this.message = 'The provided member is invalid or does not exist (for example a thumb size)' + RPCError._fmtRequest(args.request);
    }
}


class NetworkMigrateError extends InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(format('The source IP address is associated with DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request));
this.message = format('The source IP address is associated with DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}


class NewSaltInvalidError extends BadRequestError {
    constructor(args) {
        super('The new salt is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The new salt is invalid' + RPCError._fmtRequest(args.request);
    }
}


class NewSettingsInvalidError extends BadRequestError {
    constructor(args) {
        super('The new settings are invalid' + RPCError._fmtRequest(args.request));
this.message = 'The new settings are invalid' + RPCError._fmtRequest(args.request);
    }
}


class OffsetInvalidError extends BadRequestError {
    constructor(args) {
        super('The given offset was invalid, it must be divisible by 1KB. See https://core.telegram.org/api/files#downloading-files' + RPCError._fmtRequest(args.request));
this.message = 'The given offset was invalid, it must be divisible by 1KB. See https://core.telegram.org/api/files#downloading-files' + RPCError._fmtRequest(args.request);
    }
}


class OffsetPeerIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided offset peer is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided offset peer is invalid' + RPCError._fmtRequest(args.request);
    }
}


class OptionsTooMuchError extends BadRequestError {
    constructor(args) {
        super('You defined too many options for the poll' + RPCError._fmtRequest(args.request));
this.message = 'You defined too many options for the poll' + RPCError._fmtRequest(args.request);
    }
}


class PackShortNameInvalidError extends BadRequestError {
    constructor(args) {
        super('Invalid sticker pack name. It must begin with a letter, can\'t contain consecutive underscores and must end in "_by_<bot username>".' + RPCError._fmtRequest(args.request));
this.message = 'Invalid sticker pack name. It must begin with a letter, can\'t contain consecutive underscores and must end in "_by_<bot username>".' + RPCError._fmtRequest(args.request);
    }
}


class PackShortNameOccupiedError extends BadRequestError {
    constructor(args) {
        super('A stickerpack with this name already exists' + RPCError._fmtRequest(args.request));
this.message = 'A stickerpack with this name already exists' + RPCError._fmtRequest(args.request);
    }
}


class ParticipantsTooFewError extends BadRequestError {
    constructor(args) {
        super('Not enough participants' + RPCError._fmtRequest(args.request));
this.message = 'Not enough participants' + RPCError._fmtRequest(args.request);
    }
}


class ParticipantCallFailedError extends ServerError {
    constructor(args) {
        super('Failure while making call' + RPCError._fmtRequest(args.request));
this.message = 'Failure while making call' + RPCError._fmtRequest(args.request);
    }
}


class ParticipantVersionOutdatedError extends BadRequestError {
    constructor(args) {
        super('The other participant does not use an up to date telegram client with support for calls' + RPCError._fmtRequest(args.request));
this.message = 'The other participant does not use an up to date telegram client with support for calls' + RPCError._fmtRequest(args.request);
    }
}


class PasswordEmptyError extends BadRequestError {
    constructor(args) {
        super('The provided password is empty' + RPCError._fmtRequest(args.request));
this.message = 'The provided password is empty' + RPCError._fmtRequest(args.request);
    }
}


class PasswordHashInvalidError extends BadRequestError {
    constructor(args) {
        super('The password (and thus its hash value) you entered is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The password (and thus its hash value) you entered is invalid' + RPCError._fmtRequest(args.request);
    }
}


class PasswordRequiredError extends BadRequestError {
    constructor(args) {
        super('The account must have 2-factor authentication enabled (a password) before this method can be used' + RPCError._fmtRequest(args.request));
this.message = 'The account must have 2-factor authentication enabled (a password) before this method can be used' + RPCError._fmtRequest(args.request);
    }
}


class PaymentProviderInvalidError extends BadRequestError {
    constructor(args) {
        super('The payment provider was not recognised or its token was invalid' + RPCError._fmtRequest(args.request));
this.message = 'The payment provider was not recognised or its token was invalid' + RPCError._fmtRequest(args.request);
    }
}


class PeerFloodError extends BadRequestError {
    constructor(args) {
        super('Too many requests' + RPCError._fmtRequest(args.request));
this.message = 'Too many requests' + RPCError._fmtRequest(args.request);
    }
}


class PeerIdInvalidError extends BadRequestError {
    constructor(args) {
        super('An invalid Peer was used. Make sure to pass the right peer type' + RPCError._fmtRequest(args.request));
this.message = 'An invalid Peer was used. Make sure to pass the right peer type' + RPCError._fmtRequest(args.request);
    }
}


class PeerIdNotSupportedError extends BadRequestError {
    constructor(args) {
        super('The provided peer ID is not supported' + RPCError._fmtRequest(args.request));
this.message = 'The provided peer ID is not supported' + RPCError._fmtRequest(args.request);
    }
}


class PersistentTimestampEmptyError extends BadRequestError {
    constructor(args) {
        super('Persistent timestamp empty' + RPCError._fmtRequest(args.request));
this.message = 'Persistent timestamp empty' + RPCError._fmtRequest(args.request);
    }
}


class PersistentTimestampInvalidError extends BadRequestError {
    constructor(args) {
        super('Persistent timestamp invalid' + RPCError._fmtRequest(args.request));
this.message = 'Persistent timestamp invalid' + RPCError._fmtRequest(args.request);
    }
}


class PersistentTimestampOutdatedError extends ServerError {
    constructor(args) {
        super('Persistent timestamp outdated' + RPCError._fmtRequest(args.request));
this.message = 'Persistent timestamp outdated' + RPCError._fmtRequest(args.request);
    }
}


class PhoneCodeEmptyError extends BadRequestError {
    constructor(args) {
        super('The phone code is missing' + RPCError._fmtRequest(args.request));
this.message = 'The phone code is missing' + RPCError._fmtRequest(args.request);
    }
}


class PhoneCodeExpiredError extends BadRequestError {
    constructor(args) {
        super('The confirmation code has expired' + RPCError._fmtRequest(args.request));
this.message = 'The confirmation code has expired' + RPCError._fmtRequest(args.request);
    }
}


class PhoneCodeHashEmptyError extends BadRequestError {
    constructor(args) {
        super('The phone code hash is missing' + RPCError._fmtRequest(args.request));
this.message = 'The phone code hash is missing' + RPCError._fmtRequest(args.request);
    }
}


class PhoneCodeInvalidError extends BadRequestError {
    constructor(args) {
        super('The phone code entered was invalid' + RPCError._fmtRequest(args.request));
this.message = 'The phone code entered was invalid' + RPCError._fmtRequest(args.request);
    }
}


class PhoneMigrateError extends InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(format('The phone number a user is trying to use for authorization is associated with DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request));
this.message = format('The phone number a user is trying to use for authorization is associated with DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}


class PhoneNumberAppSignupForbiddenError extends BadRequestError {
    constructor(args) {
        super('' + RPCError._fmtRequest(args.request));
this.message = '' + RPCError._fmtRequest(args.request);
    }
}


class PhoneNumberBannedError extends BadRequestError {
    constructor(args) {
        super('The used phone number has been banned from Telegram and cannot be used anymore. Maybe check https://www.telegram.org/faq_spam' + RPCError._fmtRequest(args.request));
this.message = 'The used phone number has been banned from Telegram and cannot be used anymore. Maybe check https://www.telegram.org/faq_spam' + RPCError._fmtRequest(args.request);
    }
}


class PhoneNumberFloodError extends BadRequestError {
    constructor(args) {
        super('You asked for the code too many times.' + RPCError._fmtRequest(args.request));
this.message = 'You asked for the code too many times.' + RPCError._fmtRequest(args.request);
    }
}


class PhoneNumberInvalidError extends BadRequestError {
    constructor(args) {
        super('The phone number is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The phone number is invalid' + RPCError._fmtRequest(args.request);
    }
}


class PhoneNumberOccupiedError extends BadRequestError {
    constructor(args) {
        super('The phone number is already in use' + RPCError._fmtRequest(args.request));
this.message = 'The phone number is already in use' + RPCError._fmtRequest(args.request);
    }
}


class PhoneNumberUnoccupiedError extends BadRequestError {
    constructor(args) {
        super('The phone number is not yet being used' + RPCError._fmtRequest(args.request));
this.message = 'The phone number is not yet being used' + RPCError._fmtRequest(args.request);
    }
}


class PhonePasswordFloodError extends AuthKeyError {
    constructor(args) {
        super('You have tried logging in too many times' + RPCError._fmtRequest(args.request));
this.message = 'You have tried logging in too many times' + RPCError._fmtRequest(args.request);
    }
}


class PhonePasswordProtectedError extends BadRequestError {
    constructor(args) {
        super('This phone is password protected' + RPCError._fmtRequest(args.request));
this.message = 'This phone is password protected' + RPCError._fmtRequest(args.request);
    }
}


class PhotoContentUrlEmptyError extends BadRequestError {
    constructor(args) {
        super('The content from the URL used as a photo appears to be empty or has caused another HTTP error' + RPCError._fmtRequest(args.request));
this.message = 'The content from the URL used as a photo appears to be empty or has caused another HTTP error' + RPCError._fmtRequest(args.request);
    }
}


class PhotoCropSizeSmallError extends BadRequestError {
    constructor(args) {
        super('Photo is too small' + RPCError._fmtRequest(args.request));
this.message = 'Photo is too small' + RPCError._fmtRequest(args.request);
    }
}


class PhotoExtInvalidError extends BadRequestError {
    constructor(args) {
        super('The extension of the photo is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The extension of the photo is invalid' + RPCError._fmtRequest(args.request);
    }
}


class PhotoInvalidError extends BadRequestError {
    constructor(args) {
        super('Photo invalid' + RPCError._fmtRequest(args.request));
this.message = 'Photo invalid' + RPCError._fmtRequest(args.request);
    }
}


class PhotoInvalidDimensionsError extends BadRequestError {
    constructor(args) {
        super('The photo dimensions are invalid (hint: `pip install pillow` for `send_file` to resize images)' + RPCError._fmtRequest(args.request));
this.message = 'The photo dimensions are invalid (hint: `pip install pillow` for `send_file` to resize images)' + RPCError._fmtRequest(args.request);
    }
}


class PhotoSaveFileInvalidError extends BadRequestError {
    constructor(args) {
        super('The photo you tried to send cannot be saved by Telegram. A reason may be that it exceeds 10MB. Try resizing it locally' + RPCError._fmtRequest(args.request));
this.message = 'The photo you tried to send cannot be saved by Telegram. A reason may be that it exceeds 10MB. Try resizing it locally' + RPCError._fmtRequest(args.request);
    }
}


class PhotoThumbUrlEmptyError extends BadRequestError {
    constructor(args) {
        super('The URL used as a thumbnail appears to be empty or has caused another HTTP error' + RPCError._fmtRequest(args.request));
this.message = 'The URL used as a thumbnail appears to be empty or has caused another HTTP error' + RPCError._fmtRequest(args.request);
    }
}


class PinRestrictedError extends BadRequestError {
    constructor(args) {
        super('You can\'t pin messages in private chats with other people' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t pin messages in private chats with other people' + RPCError._fmtRequest(args.request);
    }
}


class PollOptionDuplicateError extends BadRequestError {
    constructor(args) {
        super('A duplicate option was sent in the same poll' + RPCError._fmtRequest(args.request));
this.message = 'A duplicate option was sent in the same poll' + RPCError._fmtRequest(args.request);
    }
}


class PollUnsupportedError extends BadRequestError {
    constructor(args) {
        super('This layer does not support polls in the issued method' + RPCError._fmtRequest(args.request));
this.message = 'This layer does not support polls in the issued method' + RPCError._fmtRequest(args.request);
    }
}


class PrivacyKeyInvalidError extends BadRequestError {
    constructor(args) {
        super('The privacy key is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The privacy key is invalid' + RPCError._fmtRequest(args.request);
    }
}


class PtsChangeEmptyError extends ServerError {
    constructor(args) {
        super('No PTS change' + RPCError._fmtRequest(args.request));
this.message = 'No PTS change' + RPCError._fmtRequest(args.request);
    }
}


class QueryIdEmptyError extends BadRequestError {
    constructor(args) {
        super('The query ID is empty' + RPCError._fmtRequest(args.request));
this.message = 'The query ID is empty' + RPCError._fmtRequest(args.request);
    }
}


class QueryIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The query ID is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The query ID is invalid' + RPCError._fmtRequest(args.request);
    }
}


class QueryTooShortError extends BadRequestError {
    constructor(args) {
        super('The query string is too short' + RPCError._fmtRequest(args.request));
this.message = 'The query string is too short' + RPCError._fmtRequest(args.request);
    }
}


class RandomIdDuplicateError extends ServerError {
    constructor(args) {
        super('You provided a random ID that was already used' + RPCError._fmtRequest(args.request));
this.message = 'You provided a random ID that was already used' + RPCError._fmtRequest(args.request);
    }
}


class RandomIdInvalidError extends BadRequestError {
    constructor(args) {
        super('A provided random ID is invalid' + RPCError._fmtRequest(args.request));
this.message = 'A provided random ID is invalid' + RPCError._fmtRequest(args.request);
    }
}


class RandomLengthInvalidError extends BadRequestError {
    constructor(args) {
        super('Random length invalid' + RPCError._fmtRequest(args.request));
this.message = 'Random length invalid' + RPCError._fmtRequest(args.request);
    }
}


class RangesInvalidError extends BadRequestError {
    constructor(args) {
        super('Invalid range provided' + RPCError._fmtRequest(args.request));
this.message = 'Invalid range provided' + RPCError._fmtRequest(args.request);
    }
}


class ReactionEmptyError extends BadRequestError {
    constructor(args) {
        super('No reaction provided' + RPCError._fmtRequest(args.request));
this.message = 'No reaction provided' + RPCError._fmtRequest(args.request);
    }
}


class ReactionInvalidError extends BadRequestError {
    constructor(args) {
        super('Invalid reaction provided (only emoji are allowed)' + RPCError._fmtRequest(args.request));
this.message = 'Invalid reaction provided (only emoji are allowed)' + RPCError._fmtRequest(args.request);
    }
}


class RegIdGenerateFailedError extends ServerError {
    constructor(args) {
        super('Failure while generating registration ID' + RPCError._fmtRequest(args.request));
this.message = 'Failure while generating registration ID' + RPCError._fmtRequest(args.request);
    }
}


class ReplyMarkupInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided reply markup is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided reply markup is invalid' + RPCError._fmtRequest(args.request);
    }
}


class ReplyMarkupTooLongError extends BadRequestError {
    constructor(args) {
        super('The data embedded in the reply markup buttons was too much' + RPCError._fmtRequest(args.request));
this.message = 'The data embedded in the reply markup buttons was too much' + RPCError._fmtRequest(args.request);
    }
}


class ResultIdDuplicateError extends BadRequestError {
    constructor(args) {
        super('Duplicated IDs on the sent results. Make sure to use unique IDs.' + RPCError._fmtRequest(args.request));
this.message = 'Duplicated IDs on the sent results. Make sure to use unique IDs.' + RPCError._fmtRequest(args.request);
    }
}


class ResultTypeInvalidError extends BadRequestError {
    constructor(args) {
        super('Result type invalid' + RPCError._fmtRequest(args.request));
this.message = 'Result type invalid' + RPCError._fmtRequest(args.request);
    }
}


class ResultsTooMuchError extends BadRequestError {
    constructor(args) {
        super('You sent too many results. See https://core.telegram.org/bots/api#answerinlinequery for the current limit.' + RPCError._fmtRequest(args.request));
this.message = 'You sent too many results. See https://core.telegram.org/bots/api#answerinlinequery for the current limit.' + RPCError._fmtRequest(args.request);
    }
}


class RightForbiddenError extends ForbiddenError {
    constructor(args) {
        super('Either your admin rights do not allow you to do this or you passed the wrong rights combination (some rights only apply to channels and vice versa)' + RPCError._fmtRequest(args.request));
this.message = 'Either your admin rights do not allow you to do this or you passed the wrong rights combination (some rights only apply to channels and vice versa)' + RPCError._fmtRequest(args.request);
    }
}


class RpcCallFailError extends BadRequestError {
    constructor(args) {
        super('Telegram is having internal issues, please try again later.' + RPCError._fmtRequest(args.request));
this.message = 'Telegram is having internal issues, please try again later.' + RPCError._fmtRequest(args.request);
    }
}


class RpcMcgetFailError extends BadRequestError {
    constructor(args) {
        super('Telegram is having internal issues, please try again later.' + RPCError._fmtRequest(args.request));
this.message = 'Telegram is having internal issues, please try again later.' + RPCError._fmtRequest(args.request);
    }
}


class RsaDecryptFailedError extends BadRequestError {
    constructor(args) {
        super('Internal RSA decryption failed' + RPCError._fmtRequest(args.request));
this.message = 'Internal RSA decryption failed' + RPCError._fmtRequest(args.request);
    }
}


class ScheduleDateTooLateError extends BadRequestError {
    constructor(args) {
        super('The date you tried to schedule is too far in the future (last known limit of 1 year and a few hours)' + RPCError._fmtRequest(args.request));
this.message = 'The date you tried to schedule is too far in the future (last known limit of 1 year and a few hours)' + RPCError._fmtRequest(args.request);
    }
}


class ScheduleTooMuchError extends BadRequestError {
    constructor(args) {
        super('You cannot schedule more messages in this chat (last known limit of 100 per chat)' + RPCError._fmtRequest(args.request));
this.message = 'You cannot schedule more messages in this chat (last known limit of 100 per chat)' + RPCError._fmtRequest(args.request);
    }
}


class SearchQueryEmptyError extends BadRequestError {
    constructor(args) {
        super('The search query is empty' + RPCError._fmtRequest(args.request));
this.message = 'The search query is empty' + RPCError._fmtRequest(args.request);
    }
}


class SecondsInvalidError extends BadRequestError {
    constructor(args) {
        super('Slow mode only supports certain values (e.g. 0, 10s, 30s, 1m, 5m, 15m and 1h)' + RPCError._fmtRequest(args.request));
this.message = 'Slow mode only supports certain values (e.g. 0, 10s, 30s, 1m, 5m, 15m and 1h)' + RPCError._fmtRequest(args.request);
    }
}


class SendMessageMediaInvalidError extends BadRequestError {
    constructor(args) {
        super('The message media was invalid or not specified' + RPCError._fmtRequest(args.request));
this.message = 'The message media was invalid or not specified' + RPCError._fmtRequest(args.request);
    }
}


class SendMessageTypeInvalidError extends BadRequestError {
    constructor(args) {
        super('The message type is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The message type is invalid' + RPCError._fmtRequest(args.request);
    }
}


class SessionExpiredError extends UnauthorizedError {
    constructor(args) {
        super('The authorization has expired' + RPCError._fmtRequest(args.request));
this.message = 'The authorization has expired' + RPCError._fmtRequest(args.request);
    }
}


class SessionPasswordNeededError extends UnauthorizedError {
    constructor(args) {
        super('Two-steps verification is enabled and a password is required' + RPCError._fmtRequest(args.request));
this.message = 'Two-steps verification is enabled and a password is required' + RPCError._fmtRequest(args.request);
    }
}


class SessionRevokedError extends UnauthorizedError {
    constructor(args) {
        super('The authorization has been invalidated, because of the user terminating all sessions' + RPCError._fmtRequest(args.request));
this.message = 'The authorization has been invalidated, because of the user terminating all sessions' + RPCError._fmtRequest(args.request);
    }
}


class Sha256HashInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided SHA256 hash is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided SHA256 hash is invalid' + RPCError._fmtRequest(args.request);
    }
}


class ShortnameOccupyFailedError extends BadRequestError {
    constructor(args) {
        super('An error occurred when trying to register the short-name used for the sticker pack. Try a different name' + RPCError._fmtRequest(args.request));
this.message = 'An error occurred when trying to register the short-name used for the sticker pack. Try a different name' + RPCError._fmtRequest(args.request);
    }
}


class SlowModeWaitError extends FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0);
        super(format('A wait of {seconds} seconds is required before sending another message in this chat', {seconds}) + RPCError._fmtRequest(args.request));
this.message = format('A wait of {seconds} seconds is required before sending another message in this chat', {seconds}) + RPCError._fmtRequest(args.request);
        this.seconds = seconds;
    }
}


class StartParamEmptyError extends BadRequestError {
    constructor(args) {
        super('The start parameter is empty' + RPCError._fmtRequest(args.request));
this.message = 'The start parameter is empty' + RPCError._fmtRequest(args.request);
    }
}


class StartParamInvalidError extends BadRequestError {
    constructor(args) {
        super('Start parameter invalid' + RPCError._fmtRequest(args.request));
this.message = 'Start parameter invalid' + RPCError._fmtRequest(args.request);
    }
}


class StickersetInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided sticker set is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided sticker set is invalid' + RPCError._fmtRequest(args.request);
    }
}


class StickersEmptyError extends BadRequestError {
    constructor(args) {
        super('No sticker provided' + RPCError._fmtRequest(args.request));
this.message = 'No sticker provided' + RPCError._fmtRequest(args.request);
    }
}


class StickerEmojiInvalidError extends BadRequestError {
    constructor(args) {
        super('Sticker emoji invalid' + RPCError._fmtRequest(args.request));
this.message = 'Sticker emoji invalid' + RPCError._fmtRequest(args.request);
    }
}


class StickerFileInvalidError extends BadRequestError {
    constructor(args) {
        super('Sticker file invalid' + RPCError._fmtRequest(args.request));
this.message = 'Sticker file invalid' + RPCError._fmtRequest(args.request);
    }
}


class StickerIdInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided sticker ID is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided sticker ID is invalid' + RPCError._fmtRequest(args.request);
    }
}


class StickerInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided sticker is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided sticker is invalid' + RPCError._fmtRequest(args.request);
    }
}


class StickerPngDimensionsError extends BadRequestError {
    constructor(args) {
        super('Sticker png dimensions invalid' + RPCError._fmtRequest(args.request));
this.message = 'Sticker png dimensions invalid' + RPCError._fmtRequest(args.request);
    }
}


class StorageCheckFailedError extends ServerError {
    constructor(args) {
        super('Server storage check failed' + RPCError._fmtRequest(args.request));
this.message = 'Server storage check failed' + RPCError._fmtRequest(args.request);
    }
}


class StoreInvalidScalarTypeError extends ServerError {
    constructor(args) {
        super('' + RPCError._fmtRequest(args.request));
this.message = '' + RPCError._fmtRequest(args.request);
    }
}


class TakeoutInitDelayError extends FloodError {
    constructor(args) {
        const seconds = Number(args.capture || 0);
        super(format('A wait of {seconds} seconds is required before being able to initiate the takeout', {seconds}) + RPCError._fmtRequest(args.request));
this.message = format('A wait of {seconds} seconds is required before being able to initiate the takeout', {seconds}) + RPCError._fmtRequest(args.request);
        this.seconds = seconds;
    }
}


class TakeoutInvalidError extends BadRequestError {
    constructor(args) {
        super('The takeout session has been invalidated by another data export session' + RPCError._fmtRequest(args.request));
this.message = 'The takeout session has been invalidated by another data export session' + RPCError._fmtRequest(args.request);
    }
}


class TakeoutRequiredError extends BadRequestError {
    constructor(args) {
        super('You must initialize a takeout request first' + RPCError._fmtRequest(args.request));
this.message = 'You must initialize a takeout request first' + RPCError._fmtRequest(args.request);
    }
}


class TempAuthKeyEmptyError extends BadRequestError {
    constructor(args) {
        super('No temporary auth key provided' + RPCError._fmtRequest(args.request));
this.message = 'No temporary auth key provided' + RPCError._fmtRequest(args.request);
    }
}


class TimeoutError extends TimedOutError {
    constructor(args) {
        super('A timeout occurred while fetching data from the worker' + RPCError._fmtRequest(args.request));
this.message = 'A timeout occurred while fetching data from the worker' + RPCError._fmtRequest(args.request);
    }
}


class TmpPasswordDisabledError extends BadRequestError {
    constructor(args) {
        super('The temporary password is disabled' + RPCError._fmtRequest(args.request));
this.message = 'The temporary password is disabled' + RPCError._fmtRequest(args.request);
    }
}


class TokenInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided token is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided token is invalid' + RPCError._fmtRequest(args.request);
    }
}


class TtlDaysInvalidError extends BadRequestError {
    constructor(args) {
        super('The provided TTL is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The provided TTL is invalid' + RPCError._fmtRequest(args.request);
    }
}


class TypesEmptyError extends BadRequestError {
    constructor(args) {
        super('The types field is empty' + RPCError._fmtRequest(args.request));
this.message = 'The types field is empty' + RPCError._fmtRequest(args.request);
    }
}


class TypeConstructorInvalidError extends BadRequestError {
    constructor(args) {
        super('The type constructor is invalid' + RPCError._fmtRequest(args.request));
this.message = 'The type constructor is invalid' + RPCError._fmtRequest(args.request);
    }
}


class UnknownMethodError extends ServerError {
    constructor(args) {
        super('The method you tried to call cannot be called on non-CDN DCs' + RPCError._fmtRequest(args.request));
this.message = 'The method you tried to call cannot be called on non-CDN DCs' + RPCError._fmtRequest(args.request);
    }
}


class UntilDateInvalidError extends BadRequestError {
    constructor(args) {
        super('That date cannot be specified in this request (try using None)' + RPCError._fmtRequest(args.request));
this.message = 'That date cannot be specified in this request (try using None)' + RPCError._fmtRequest(args.request);
    }
}


class UrlInvalidError extends BadRequestError {
    constructor(args) {
        super('The URL used was invalid (e.g. when answering a callback with an URL that\'s not t.me/yourbot or your game\'s URL)' + RPCError._fmtRequest(args.request));
this.message = 'The URL used was invalid (e.g. when answering a callback with an URL that\'s not t.me/yourbot or your game\'s URL)' + RPCError._fmtRequest(args.request);
    }
}


class UsernameInvalidError extends BadRequestError {
    constructor(args) {
        super('Nobody is using this username, or the username is unacceptable. If the latter, it must match r"[a-zA-Z][\w\d]{3,30}[a-zA-Z\d]"' + RPCError._fmtRequest(args.request));
this.message = 'Nobody is using this username, or the username is unacceptable. If the latter, it must match r"[a-zA-Z][\w\d]{3,30}[a-zA-Z\d]"' + RPCError._fmtRequest(args.request);
    }
}


class UsernameNotModifiedError extends BadRequestError {
    constructor(args) {
        super('The username is not different from the current username' + RPCError._fmtRequest(args.request));
this.message = 'The username is not different from the current username' + RPCError._fmtRequest(args.request);
    }
}


class UsernameNotOccupiedError extends BadRequestError {
    constructor(args) {
        super('The username is not in use by anyone else yet' + RPCError._fmtRequest(args.request));
this.message = 'The username is not in use by anyone else yet' + RPCError._fmtRequest(args.request);
    }
}


class UsernameOccupiedError extends BadRequestError {
    constructor(args) {
        super('The username is already taken' + RPCError._fmtRequest(args.request));
this.message = 'The username is already taken' + RPCError._fmtRequest(args.request);
    }
}


class UsersTooFewError extends BadRequestError {
    constructor(args) {
        super('Not enough users (to create a chat, for example)' + RPCError._fmtRequest(args.request));
this.message = 'Not enough users (to create a chat, for example)' + RPCError._fmtRequest(args.request);
    }
}


class UsersTooMuchError extends BadRequestError {
    constructor(args) {
        super('The maximum number of users has been exceeded (to create a chat, for example)' + RPCError._fmtRequest(args.request));
this.message = 'The maximum number of users has been exceeded (to create a chat, for example)' + RPCError._fmtRequest(args.request);
    }
}


class UserAdminInvalidError extends BadRequestError {
    constructor(args) {
        super('Either you\'re not an admin or you tried to ban an admin that you didn\'t promote' + RPCError._fmtRequest(args.request));
this.message = 'Either you\'re not an admin or you tried to ban an admin that you didn\'t promote' + RPCError._fmtRequest(args.request);
    }
}


class UserAlreadyParticipantError extends BadRequestError {
    constructor(args) {
        super('The authenticated user is already a participant of the chat' + RPCError._fmtRequest(args.request));
this.message = 'The authenticated user is already a participant of the chat' + RPCError._fmtRequest(args.request);
    }
}


class UserBannedInChannelError extends BadRequestError {
    constructor(args) {
        super('You\'re banned from sending messages in supergroups/channels' + RPCError._fmtRequest(args.request));
this.message = 'You\'re banned from sending messages in supergroups/channels' + RPCError._fmtRequest(args.request);
    }
}


class UserBlockedError extends BadRequestError {
    constructor(args) {
        super('User blocked' + RPCError._fmtRequest(args.request));
this.message = 'User blocked' + RPCError._fmtRequest(args.request);
    }
}


class UserBotError extends BadRequestError {
    constructor(args) {
        super('Bots can only be admins in channels.' + RPCError._fmtRequest(args.request));
this.message = 'Bots can only be admins in channels.' + RPCError._fmtRequest(args.request);
    }
}


class UserBotInvalidError extends BadRequestError {
    constructor(args) {
        super('This method can only be called by a bot' + RPCError._fmtRequest(args.request));
this.message = 'This method can only be called by a bot' + RPCError._fmtRequest(args.request);
    }
}


class UserBotRequiredError extends BadRequestError {
    constructor(args) {
        super('This method can only be called by a bot' + RPCError._fmtRequest(args.request));
this.message = 'This method can only be called by a bot' + RPCError._fmtRequest(args.request);
    }
}


class UserChannelsTooMuchError extends ForbiddenError {
    constructor(args) {
        super('One of the users you tried to add is already in too many channels/supergroups' + RPCError._fmtRequest(args.request));
this.message = 'One of the users you tried to add is already in too many channels/supergroups' + RPCError._fmtRequest(args.request);
    }
}


class UserCreatorError extends BadRequestError {
    constructor(args) {
        super('You can\'t leave this channel, because you\'re its creator' + RPCError._fmtRequest(args.request));
this.message = 'You can\'t leave this channel, because you\'re its creator' + RPCError._fmtRequest(args.request);
    }
}


class UserDeactivatedError extends UnauthorizedError {
    constructor(args) {
        super('The user has been deleted/deactivated' + RPCError._fmtRequest(args.request));
this.message = 'The user has been deleted/deactivated' + RPCError._fmtRequest(args.request);
    }
}


class UserDeactivatedBanError extends UnauthorizedError {
    constructor(args) {
        super('The user has been deleted/deactivated' + RPCError._fmtRequest(args.request));
this.message = 'The user has been deleted/deactivated' + RPCError._fmtRequest(args.request);
    }
}


class UserIdInvalidError extends BadRequestError {
    constructor(args) {
        super('Invalid object ID for a user. Make sure to pass the right types, for instance making sure that the request is designed for users or otherwise look for a different one more suited' + RPCError._fmtRequest(args.request));
this.message = 'Invalid object ID for a user. Make sure to pass the right types, for instance making sure that the request is designed for users or otherwise look for a different one more suited' + RPCError._fmtRequest(args.request);
    }
}


class UserInvalidError extends BadRequestError {
    constructor(args) {
        super('The given user was invalid' + RPCError._fmtRequest(args.request));
this.message = 'The given user was invalid' + RPCError._fmtRequest(args.request);
    }
}


class UserIsBlockedError extends BadRequestError {
    constructor(args) {
        super('User is blocked' + RPCError._fmtRequest(args.request));
this.message = 'User is blocked' + RPCError._fmtRequest(args.request);
    }
}


class UserIsBotError extends BadRequestError {
    constructor(args) {
        super('Bots can\'t send messages to other bots' + RPCError._fmtRequest(args.request));
this.message = 'Bots can\'t send messages to other bots' + RPCError._fmtRequest(args.request);
    }
}


class UserKickedError extends BadRequestError {
    constructor(args) {
        super('This user was kicked from this supergroup/channel' + RPCError._fmtRequest(args.request));
this.message = 'This user was kicked from this supergroup/channel' + RPCError._fmtRequest(args.request);
    }
}


class UserMigrateError extends InvalidDCError {
    constructor(args) {
        const newDc = Number(args.capture || 0);
        super(format('The user whose identity is being used to execute queries is associated with DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request));
this.message = format('The user whose identity is being used to execute queries is associated with DC {new_dc}', {newDc}) + RPCError._fmtRequest(args.request);
        this.newDc = newDc;
    }
}


class UserNotMutualContactError extends BadRequestError {
    constructor(args) {
        super('The provided user is not a mutual contact' + RPCError._fmtRequest(args.request));
this.message = 'The provided user is not a mutual contact' + RPCError._fmtRequest(args.request);
    }
}


class UserNotParticipantError extends BadRequestError {
    constructor(args) {
        super('The target user is not a member of the specified megagroup or channel' + RPCError._fmtRequest(args.request));
this.message = 'The target user is not a member of the specified megagroup or channel' + RPCError._fmtRequest(args.request);
    }
}


class UserPrivacyRestrictedError extends ForbiddenError {
    constructor(args) {
        super('The user\'s privacy settings do not allow you to do this' + RPCError._fmtRequest(args.request));
this.message = 'The user\'s privacy settings do not allow you to do this' + RPCError._fmtRequest(args.request);
    }
}


class UserRestrictedError extends ForbiddenError {
    constructor(args) {
        super('You\'re spamreported, you can\'t create channels or chats.' + RPCError._fmtRequest(args.request));
this.message = 'You\'re spamreported, you can\'t create channels or chats.' + RPCError._fmtRequest(args.request);
    }
}


class VideoContentTypeInvalidError extends BadRequestError {
    constructor(args) {
        super('The video content type is not supported with the given parameters (i.e. supports_streaming)' + RPCError._fmtRequest(args.request));
this.message = 'The video content type is not supported with the given parameters (i.e. supports_streaming)' + RPCError._fmtRequest(args.request);
    }
}


class WallpaperFileInvalidError extends BadRequestError {
    constructor(args) {
        super('The given file cannot be used as a wallpaper' + RPCError._fmtRequest(args.request));
this.message = 'The given file cannot be used as a wallpaper' + RPCError._fmtRequest(args.request);
    }
}


class WallpaperInvalidError extends BadRequestError {
    constructor(args) {
        super('The input wallpaper was not valid' + RPCError._fmtRequest(args.request));
this.message = 'The input wallpaper was not valid' + RPCError._fmtRequest(args.request);
    }
}


class WcConvertUrlInvalidError extends BadRequestError {
    constructor(args) {
        super('WC convert URL invalid' + RPCError._fmtRequest(args.request));
this.message = 'WC convert URL invalid' + RPCError._fmtRequest(args.request);
    }
}


class WebpageCurlFailedError extends BadRequestError {
    constructor(args) {
        super('Failure while fetching the webpage with cURL' + RPCError._fmtRequest(args.request));
this.message = 'Failure while fetching the webpage with cURL' + RPCError._fmtRequest(args.request);
    }
}


class WebpageMediaEmptyError extends BadRequestError {
    constructor(args) {
        super('Webpage media empty' + RPCError._fmtRequest(args.request));
this.message = 'Webpage media empty' + RPCError._fmtRequest(args.request);
    }
}


class WorkerBusyTooLongRetryError extends ServerError {
    constructor(args) {
        super('Telegram workers are too busy to respond immediately' + RPCError._fmtRequest(args.request));
this.message = 'Telegram workers are too busy to respond immediately' + RPCError._fmtRequest(args.request);
    }
}


class YouBlockedUserError extends BadRequestError {
    constructor(args) {
        super('You blocked this user' + RPCError._fmtRequest(args.request));
this.message = 'You blocked this user' + RPCError._fmtRequest(args.request);
    }
}


const rpcErrorsObject = {
    ABOUT_TOO_LONG: AboutTooLongError,
    ACCESS_TOKEN_EXPIRED: AccessTokenExpiredError,
    ACCESS_TOKEN_INVALID: AccessTokenInvalidError,
    ACTIVE_USER_REQUIRED: ActiveUserRequiredError,
    ADMINS_TOO_MUCH: AdminsTooMuchError,
    ADMIN_RANK_EMOJI_NOT_ALLOWED: AdminRankEmojiNotAllowedError,
    ADMIN_RANK_INVALID: AdminRankInvalidError,
    API_ID_INVALID: ApiIdInvalidError,
    API_ID_PUBLISHED_FLOOD: ApiIdPublishedFloodError,
    ARTICLE_TITLE_EMPTY: ArticleTitleEmptyError,
    AUTH_BYTES_INVALID: AuthBytesInvalidError,
    AUTH_KEY_DUPLICATED: AuthKeyDuplicatedError,
    AUTH_KEY_INVALID: AuthKeyInvalidError,
    AUTH_KEY_PERM_EMPTY: AuthKeyPermEmptyError,
    AUTH_KEY_UNREGISTERED: AuthKeyUnregisteredError,
    AUTH_RESTART: AuthRestartError,
    BANNED_RIGHTS_INVALID: BannedRightsInvalidError,
    BOTS_TOO_MUCH: BotsTooMuchError,
    BOT_CHANNELS_NA: BotChannelsNaError,
    BOT_GROUPS_BLOCKED: BotGroupsBlockedError,
    BOT_INLINE_DISABLED: BotInlineDisabledError,
    BOT_INVALID: BotInvalidError,
    BOT_METHOD_INVALID: BotMethodInvalidError,
    BOT_MISSING: BotMissingError,
    BOT_PAYMENTS_DISABLED: BotPaymentsDisabledError,
    BOT_POLLS_DISABLED: BotPollsDisabledError,
    BROADCAST_ID_INVALID: BroadcastIdInvalidError,
    BUTTON_DATA_INVALID: ButtonDataInvalidError,
    BUTTON_TYPE_INVALID: ButtonTypeInvalidError,
    BUTTON_URL_INVALID: ButtonUrlInvalidError,
    CALL_ALREADY_ACCEPTED: CallAlreadyAcceptedError,
    CALL_ALREADY_DECLINED: CallAlreadyDeclinedError,
    CALL_OCCUPY_FAILED: CallOccupyFailedError,
    CALL_PEER_INVALID: CallPeerInvalidError,
    CALL_PROTOCOL_FLAGS_INVALID: CallProtocolFlagsInvalidError,
    CDN_METHOD_INVALID: CdnMethodInvalidError,
    CHANNELS_ADMIN_PUBLIC_TOO_MUCH: ChannelsAdminPublicTooMuchError,
    CHANNELS_TOO_MUCH: ChannelsTooMuchError,
    CHANNEL_INVALID: ChannelInvalidError,
    CHANNEL_PRIVATE: ChannelPrivateError,
    CHANNEL_PUBLIC_GROUP_NA: ChannelPublicGroupNaError,
    CHAT_ABOUT_NOT_MODIFIED: ChatAboutNotModifiedError,
    CHAT_ABOUT_TOO_LONG: ChatAboutTooLongError,
    CHAT_ADMIN_INVITE_REQUIRED: ChatAdminInviteRequiredError,
    CHAT_ADMIN_REQUIRED: ChatAdminRequiredError,
    CHAT_FORBIDDEN: ChatForbiddenError,
    CHAT_ID_EMPTY: ChatIdEmptyError,
    CHAT_ID_INVALID: ChatIdInvalidError,
    CHAT_INVALID: ChatInvalidError,
    CHAT_LINK_EXISTS: ChatLinkExistsError,
    CHAT_NOT_MODIFIED: ChatNotModifiedError,
    CHAT_RESTRICTED: ChatRestrictedError,
    CHAT_SEND_GIFS_FORBIDDEN: ChatSendGifsForbiddenError,
    CHAT_SEND_INLINE_FORBIDDEN: ChatSendInlineForbiddenError,
    CHAT_SEND_MEDIA_FORBIDDEN: ChatSendMediaForbiddenError,
    CHAT_SEND_STICKERS_FORBIDDEN: ChatSendStickersForbiddenError,
    CHAT_TITLE_EMPTY: ChatTitleEmptyError,
    CHAT_WRITE_FORBIDDEN: ChatWriteForbiddenError,
    CODE_EMPTY: CodeEmptyError,
    CODE_HASH_INVALID: CodeHashInvalidError,
    CODE_INVALID: CodeInvalidError,
    CONNECTION_API_ID_INVALID: ConnectionApiIdInvalidError,
    CONNECTION_DEVICE_MODEL_EMPTY: ConnectionDeviceModelEmptyError,
    CONNECTION_LANG_PACK_INVALID: ConnectionLangPackInvalidError,
    CONNECTION_LAYER_INVALID: ConnectionLayerInvalidError,
    CONNECTION_NOT_INITED: ConnectionNotInitedError,
    CONNECTION_SYSTEM_EMPTY: ConnectionSystemEmptyError,
    CONTACT_ID_INVALID: ContactIdInvalidError,
    DATA_INVALID: DataInvalidError,
    DATA_JSON_INVALID: DataJsonInvalidError,
    DATE_EMPTY: DateEmptyError,
    DC_ID_INVALID: DcIdInvalidError,
    DH_G_A_INVALID: DhGAInvalidError,
    EMAIL_HASH_EXPIRED: EmailHashExpiredError,
    EMAIL_INVALID: EmailInvalidError,
    EMOTICON_EMPTY: EmoticonEmptyError,
    ENCRYPTED_MESSAGE_INVALID: EncryptedMessageInvalidError,
    ENCRYPTION_ALREADY_ACCEPTED: EncryptionAlreadyAcceptedError,
    ENCRYPTION_ALREADY_DECLINED: EncryptionAlreadyDeclinedError,
    ENCRYPTION_DECLINED: EncryptionDeclinedError,
    ENCRYPTION_ID_INVALID: EncryptionIdInvalidError,
    ENCRYPTION_OCCUPY_FAILED: EncryptionOccupyFailedError,
    ENTITIES_TOO_LONG: EntitiesTooLongError,
    ENTITY_MENTION_USER_INVALID: EntityMentionUserInvalidError,
    ERROR_TEXT_EMPTY: ErrorTextEmptyError,
    EXPORT_CARD_INVALID: ExportCardInvalidError,
    EXTERNAL_URL_INVALID: ExternalUrlInvalidError,
    FIELD_NAME_EMPTY: FieldNameEmptyError,
    FIELD_NAME_INVALID: FieldNameInvalidError,
    FILE_ID_INVALID: FileIdInvalidError,
    FILE_PARTS_INVALID: FilePartsInvalidError,
    FILE_PART_0_MISSING: FilePart0MissingError,
    FILE_PART_EMPTY: FilePartEmptyError,
    FILE_PART_INVALID: FilePartInvalidError,
    FILE_PART_LENGTH_INVALID: FilePartLengthInvalidError,
    FILE_PART_SIZE_INVALID: FilePartSizeInvalidError,
    FILEREF_UPGRADE_NEEDED: FilerefUpgradeNeededError,
    FIRSTNAME_INVALID: FirstNameInvalidError,
    FOLDER_ID_EMPTY: FolderIdEmptyError,
    FOLDER_ID_INVALID: FolderIdInvalidError,
    FRESH_RESET_AUTHORISATION_FORBIDDEN: FreshResetAuthorisationForbiddenError,
    GIF_ID_INVALID: GifIdInvalidError,
    GROUPED_MEDIA_INVALID: GroupedMediaInvalidError,
    HASH_INVALID: HashInvalidError,
    HISTORY_GET_FAILED: HistoryGetFailedError,
    IMAGE_PROCESS_FAILED: ImageProcessFailedError,
    INLINE_RESULT_EXPIRED: InlineResultExpiredError,
    INPUT_CONSTRUCTOR_INVALID: InputConstructorInvalidError,
    INPUT_FETCH_ERROR: InputFetchErrorError,
    INPUT_FETCH_FAIL: InputFetchFailError,
    INPUT_LAYER_INVALID: InputLayerInvalidError,
    INPUT_METHOD_INVALID: InputMethodInvalidError,
    INPUT_REQUEST_TOO_LONG: InputRequestTooLongError,
    INPUT_USER_DEACTIVATED: InputUserDeactivatedError,
    INVITE_HASH_EMPTY: InviteHashEmptyError,
    INVITE_HASH_EXPIRED: InviteHashExpiredError,
    INVITE_HASH_INVALID: InviteHashInvalidError,
    LANG_PACK_INVALID: LangPackInvalidError,
    LASTNAME_INVALID: LastnameInvalidError,
    LIMIT_INVALID: LimitInvalidError,
    LINK_NOT_MODIFIED: LinkNotModifiedError,
    LOCATION_INVALID: LocationInvalidError,
    MAX_ID_INVALID: MaxIdInvalidError,
    MAX_QTS_INVALID: MaxQtsInvalidError,
    MD5_CHECKSUM_INVALID: Md5ChecksumInvalidError,
    MEDIA_CAPTION_TOO_LONG: MediaCaptionTooLongError,
    MEDIA_EMPTY: MediaEmptyError,
    MEDIA_INVALID: MediaInvalidError,
    MEDIA_NEW_INVALID: MediaNewInvalidError,
    MEDIA_PREV_INVALID: MediaPrevInvalidError,
    MEGAGROUP_ID_INVALID: MegagroupIdInvalidError,
    MEGAGROUP_PREHISTORY_HIDDEN: MegagroupPrehistoryHiddenError,
    MEMBER_NO_LOCATION: MemberNoLocationError,
    MEMBER_OCCUPY_PRIMARY_LOC_FAILED: MemberOccupyPrimaryLocFailedError,
    MESSAGE_AUTHOR_REQUIRED: MessageAuthorRequiredError,
    MESSAGE_DELETE_FORBIDDEN: MessageDeleteForbiddenError,
    MESSAGE_EDIT_TIME_EXPIRED: MessageEditTimeExpiredError,
    MESSAGE_EMPTY: MessageEmptyError,
    MESSAGE_IDS_EMPTY: MessageIdsEmptyError,
    MESSAGE_ID_INVALID: MessageIdInvalidError,
    MESSAGE_NOT_MODIFIED: MessageNotModifiedError,
    MESSAGE_TOO_LONG: MessageTooLongError,
    MSG_WAIT_FAILED: MsgWaitFailedError,
    MT_SEND_QUEUE_TOO_LONG: MtSendQueueTooLongError,
    NEED_CHAT_INVALID: NeedChatInvalidError,
    NEED_MEMBER_INVALID: NeedMemberInvalidError,
    NEW_SALT_INVALID: NewSaltInvalidError,
    NEW_SETTINGS_INVALID: NewSettingsInvalidError,
    OFFSET_INVALID: OffsetInvalidError,
    OFFSET_PEER_ID_INVALID: OffsetPeerIdInvalidError,
    OPTIONS_TOO_MUCH: OptionsTooMuchError,
    PACK_SHORT_NAME_INVALID: PackShortNameInvalidError,
    PACK_SHORT_NAME_OCCUPIED: PackShortNameOccupiedError,
    PARTICIPANTS_TOO_FEW: ParticipantsTooFewError,
    PARTICIPANT_CALL_FAILED: ParticipantCallFailedError,
    PARTICIPANT_VERSION_OUTDATED: ParticipantVersionOutdatedError,
    PASSWORD_EMPTY: PasswordEmptyError,
    PASSWORD_HASH_INVALID: PasswordHashInvalidError,
    PASSWORD_REQUIRED: PasswordRequiredError,
    PAYMENT_PROVIDER_INVALID: PaymentProviderInvalidError,
    PEER_FLOOD: PeerFloodError,
    PEER_ID_INVALID: PeerIdInvalidError,
    PEER_ID_NOT_SUPPORTED: PeerIdNotSupportedError,
    PERSISTENT_TIMESTAMP_EMPTY: PersistentTimestampEmptyError,
    PERSISTENT_TIMESTAMP_INVALID: PersistentTimestampInvalidError,
    PERSISTENT_TIMESTAMP_OUTDATED: PersistentTimestampOutdatedError,
    PHONE_CODE_EMPTY: PhoneCodeEmptyError,
    PHONE_CODE_EXPIRED: PhoneCodeExpiredError,
    PHONE_CODE_HASH_EMPTY: PhoneCodeHashEmptyError,
    PHONE_CODE_INVALID: PhoneCodeInvalidError,
    PHONE_NUMBER_APP_SIGNUP_FORBIDDEN: PhoneNumberAppSignupForbiddenError,
    PHONE_NUMBER_BANNED: PhoneNumberBannedError,
    PHONE_NUMBER_FLOOD: PhoneNumberFloodError,
    PHONE_NUMBER_INVALID: PhoneNumberInvalidError,
    PHONE_NUMBER_OCCUPIED: PhoneNumberOccupiedError,
    PHONE_NUMBER_UNOCCUPIED: PhoneNumberUnoccupiedError,
    PHONE_PASSWORD_FLOOD: PhonePasswordFloodError,
    PHONE_PASSWORD_PROTECTED: PhonePasswordProtectedError,
    PHOTO_CONTENT_URL_EMPTY: PhotoContentUrlEmptyError,
    PHOTO_CROP_SIZE_SMALL: PhotoCropSizeSmallError,
    PHOTO_EXT_INVALID: PhotoExtInvalidError,
    PHOTO_INVALID: PhotoInvalidError,
    PHOTO_INVALID_DIMENSIONS: PhotoInvalidDimensionsError,
    PHOTO_SAVE_FILE_INVALID: PhotoSaveFileInvalidError,
    PHOTO_THUMB_URL_EMPTY: PhotoThumbUrlEmptyError,
    PIN_RESTRICTED: PinRestrictedError,
    POLL_OPTION_DUPLICATE: PollOptionDuplicateError,
    POLL_UNSUPPORTED: PollUnsupportedError,
    PRIVACY_KEY_INVALID: PrivacyKeyInvalidError,
    PTS_CHANGE_EMPTY: PtsChangeEmptyError,
    QUERY_ID_EMPTY: QueryIdEmptyError,
    QUERY_ID_INVALID: QueryIdInvalidError,
    QUERY_TOO_SHORT: QueryTooShortError,
    RANDOM_ID_DUPLICATE: RandomIdDuplicateError,
    RANDOM_ID_INVALID: RandomIdInvalidError,
    RANDOM_LENGTH_INVALID: RandomLengthInvalidError,
    RANGES_INVALID: RangesInvalidError,
    REACTION_EMPTY: ReactionEmptyError,
    REACTION_INVALID: ReactionInvalidError,
    REG_ID_GENERATE_FAILED: RegIdGenerateFailedError,
    REPLY_MARKUP_INVALID: ReplyMarkupInvalidError,
    REPLY_MARKUP_TOO_LONG: ReplyMarkupTooLongError,
    RESULT_ID_DUPLICATE: ResultIdDuplicateError,
    RESULT_TYPE_INVALID: ResultTypeInvalidError,
    RESULTS_TOO_MUCH: ResultsTooMuchError,
    RIGHT_FORBIDDEN: RightForbiddenError,
    RPC_CALL_FAIL: RpcCallFailError,
    RPC_MCGET_FAIL: RpcMcgetFailError,
    RSA_DECRYPT_FAILED: RsaDecryptFailedError,
    SCHEDULE_DATE_TOO_LATE: ScheduleDateTooLateError,
    SCHEDULE_TOO_MUCH: ScheduleTooMuchError,
    SEARCH_QUERY_EMPTY: SearchQueryEmptyError,
    SECONDS_INVALID: SecondsInvalidError,
    SEND_MESSAGE_MEDIA_INVALID: SendMessageMediaInvalidError,
    SEND_MESSAGE_TYPE_INVALID: SendMessageTypeInvalidError,
    SESSION_EXPIRED: SessionExpiredError,
    SESSION_PASSWORD_NEEDED: SessionPasswordNeededError,
    SESSION_REVOKED: SessionRevokedError,
    SHA256_HASH_INVALID: Sha256HashInvalidError,
    SHORTNAME_OCCUPY_FAILED: ShortnameOccupyFailedError,
    START_PARAM_EMPTY: StartParamEmptyError,
    START_PARAM_INVALID: StartParamInvalidError,
    STICKERSET_INVALID: StickersetInvalidError,
    STICKERS_EMPTY: StickersEmptyError,
    STICKER_EMOJI_INVALID: StickerEmojiInvalidError,
    STICKER_FILE_INVALID: StickerFileInvalidError,
    STICKER_ID_INVALID: StickerIdInvalidError,
    STICKER_INVALID: StickerInvalidError,
    STICKER_PNG_DIMENSIONS: StickerPngDimensionsError,
    STORAGE_CHECK_FAILED: StorageCheckFailedError,
    STORE_INVALID_SCALAR_TYPE: StoreInvalidScalarTypeError,
    TAKEOUT_INVALID: TakeoutInvalidError,
    TAKEOUT_REQUIRED: TakeoutRequiredError,
    TEMP_AUTH_KEY_EMPTY: TempAuthKeyEmptyError,
    Timeout: TimeoutError,
    TMP_PASSWORD_DISABLED: TmpPasswordDisabledError,
    TOKEN_INVALID: TokenInvalidError,
    TTL_DAYS_INVALID: TtlDaysInvalidError,
    TYPES_EMPTY: TypesEmptyError,
    TYPE_CONSTRUCTOR_INVALID: TypeConstructorInvalidError,
    UNKNOWN_METHOD: UnknownMethodError,
    UNTIL_DATE_INVALID: UntilDateInvalidError,
    URL_INVALID: UrlInvalidError,
    USERNAME_INVALID: UsernameInvalidError,
    USERNAME_NOT_MODIFIED: UsernameNotModifiedError,
    USERNAME_NOT_OCCUPIED: UsernameNotOccupiedError,
    USERNAME_OCCUPIED: UsernameOccupiedError,
    USERS_TOO_FEW: UsersTooFewError,
    USERS_TOO_MUCH: UsersTooMuchError,
    USER_ADMIN_INVALID: UserAdminInvalidError,
    USER_ALREADY_PARTICIPANT: UserAlreadyParticipantError,
    USER_BANNED_IN_CHANNEL: UserBannedInChannelError,
    USER_BLOCKED: UserBlockedError,
    USER_BOT: UserBotError,
    USER_BOT_INVALID: UserBotInvalidError,
    USER_BOT_REQUIRED: UserBotRequiredError,
    USER_CHANNELS_TOO_MUCH: UserChannelsTooMuchError,
    USER_CREATOR: UserCreatorError,
    USER_DEACTIVATED: UserDeactivatedError,
    USER_DEACTIVATED_BAN: UserDeactivatedBanError,
    USER_ID_INVALID: UserIdInvalidError,
    USER_INVALID: UserInvalidError,
    USER_IS_BLOCKED: UserIsBlockedError,
    USER_IS_BOT: UserIsBotError,
    USER_KICKED: UserKickedError,
    USER_NOT_MUTUAL_CONTACT: UserNotMutualContactError,
    USER_NOT_PARTICIPANT: UserNotParticipantError,
    USER_PRIVACY_RESTRICTED: UserPrivacyRestrictedError,
    USER_RESTRICTED: UserRestrictedError,
    VIDEO_CONTENT_TYPE_INVALID: VideoContentTypeInvalidError,
    WALLPAPER_FILE_INVALID: WallpaperFileInvalidError,
    WALLPAPER_INVALID: WallpaperInvalidError,
    WC_CONVERT_URL_INVALID: WcConvertUrlInvalidError,
    WEBPAGE_CURL_FAILED: WebpageCurlFailedError,
    WEBPAGE_MEDIA_EMPTY: WebpageMediaEmptyError,
    WORKER_BUSY_TOO_LONG_RETRY: WorkerBusyTooLongRetryError,
    YOU_BLOCKED_USER: YouBlockedUserError,
};

const rpcErrorRe = [
    [/EMAIL_UNCONFIRMED_(\d+)/, EmailUnconfirmedError],
    [/FILE_MIGRATE_(\d+)/, FileMigrateError],
    [/FILE_PART_(\d+)_MISSING/, FilePartMissingError],
    [/FLOOD_TEST_PHONE_WAIT_(\d+)/, FloodTestPhoneWaitError],
    [/FLOOD_WAIT_(\d+)/, FloodWaitError],
    [/INTERDC_(\d+)_CALL_ERROR/, InterdcCallErrorError],
    [/INTERDC_(\d+)_CALL_RICH_ERROR/, InterdcCallRichErrorError],
    [/NETWORK_MIGRATE_(\d+)/, NetworkMigrateError],
    [/PHONE_MIGRATE_(\d+)/, PhoneMigrateError],
    [/SLOWMODE_WAIT_(\d+)/, SlowModeWaitError],
    [/TAKEOUT_INIT_DELAY_(\d+)/, TakeoutInitDelayError],
    [/USER_MIGRATE_(\d+)/, UserMigrateError],
];module.exports = {     EmailUnconfirmedError,
     FileMigrateError,
     FilePartMissingError,
     FloodTestPhoneWaitError,
     FloodWaitError,
     InterdcCallErrorError,
     InterdcCallRichErrorError,
     NetworkMigrateError,
     PhoneMigrateError,
     SlowModeWaitError,
     TakeoutInitDelayError,
     UserMigrateError,
     AboutTooLongError,
     AccessTokenExpiredError,
     AccessTokenInvalidError,
     ActiveUserRequiredError,
     AdminsTooMuchError,
     AdminRankEmojiNotAllowedError,
     AdminRankInvalidError,
     ApiIdInvalidError,
     ApiIdPublishedFloodError,
     ArticleTitleEmptyError,
     AuthBytesInvalidError,
     AuthKeyDuplicatedError,
     AuthKeyInvalidError,
     AuthKeyPermEmptyError,
     AuthKeyUnregisteredError,
     AuthRestartError,
     BannedRightsInvalidError,
     BotsTooMuchError,
     BotChannelsNaError,
     BotGroupsBlockedError,
     BotInlineDisabledError,
     BotInvalidError,
     BotMethodInvalidError,
     BotMissingError,
     BotPaymentsDisabledError,
     BotPollsDisabledError,
     BroadcastIdInvalidError,
     ButtonDataInvalidError,
     ButtonTypeInvalidError,
     ButtonUrlInvalidError,
     CallAlreadyAcceptedError,
     CallAlreadyDeclinedError,
     CallOccupyFailedError,
     CallPeerInvalidError,
     CallProtocolFlagsInvalidError,
     CdnMethodInvalidError,
     ChannelsAdminPublicTooMuchError,
     ChannelsTooMuchError,
     ChannelInvalidError,
     ChannelPrivateError,
     ChannelPublicGroupNaError,
     ChatAboutNotModifiedError,
     ChatAboutTooLongError,
     ChatAdminInviteRequiredError,
     ChatAdminRequiredError,
     ChatForbiddenError,
     ChatIdEmptyError,
     ChatIdInvalidError,
     ChatInvalidError,
     ChatLinkExistsError,
     ChatNotModifiedError,
     ChatRestrictedError,
     ChatSendGifsForbiddenError,
     ChatSendInlineForbiddenError,
     ChatSendMediaForbiddenError,
     ChatSendStickersForbiddenError,
     ChatTitleEmptyError,
     ChatWriteForbiddenError,
     CodeEmptyError,
     CodeHashInvalidError,
     CodeInvalidError,
     ConnectionApiIdInvalidError,
     ConnectionDeviceModelEmptyError,
     ConnectionLangPackInvalidError,
     ConnectionLayerInvalidError,
     ConnectionNotInitedError,
     ConnectionSystemEmptyError,
     ContactIdInvalidError,
     DataInvalidError,
     DataJsonInvalidError,
     DateEmptyError,
     DcIdInvalidError,
     DhGAInvalidError,
     EmailHashExpiredError,
     EmailInvalidError,
     EmoticonEmptyError,
     EncryptedMessageInvalidError,
     EncryptionAlreadyAcceptedError,
     EncryptionAlreadyDeclinedError,
     EncryptionDeclinedError,
     EncryptionIdInvalidError,
     EncryptionOccupyFailedError,
     EntitiesTooLongError,
     EntityMentionUserInvalidError,
     ErrorTextEmptyError,
     ExportCardInvalidError,
     ExternalUrlInvalidError,
     FieldNameEmptyError,
     FieldNameInvalidError,
     FileIdInvalidError,
     FilePartsInvalidError,
     FilePart0MissingError,
     FilePartEmptyError,
     FilePartInvalidError,
     FilePartLengthInvalidError,
     FilePartSizeInvalidError,
     FilerefUpgradeNeededError,
     FirstNameInvalidError,
     FolderIdEmptyError,
     FolderIdInvalidError,
     FreshResetAuthorisationForbiddenError,
     GifIdInvalidError,
     GroupedMediaInvalidError,
     HashInvalidError,
     HistoryGetFailedError,
     ImageProcessFailedError,
     InlineResultExpiredError,
     InputConstructorInvalidError,
     InputFetchErrorError,
     InputFetchFailError,
     InputLayerInvalidError,
     InputMethodInvalidError,
     InputRequestTooLongError,
     InputUserDeactivatedError,
     InviteHashEmptyError,
     InviteHashExpiredError,
     InviteHashInvalidError,
     LangPackInvalidError,
     LastnameInvalidError,
     LimitInvalidError,
     LinkNotModifiedError,
     LocationInvalidError,
     MaxIdInvalidError,
     MaxQtsInvalidError,
     Md5ChecksumInvalidError,
     MediaCaptionTooLongError,
     MediaEmptyError,
     MediaInvalidError,
     MediaNewInvalidError,
     MediaPrevInvalidError,
     MegagroupIdInvalidError,
     MegagroupPrehistoryHiddenError,
     MemberNoLocationError,
     MemberOccupyPrimaryLocFailedError,
     MessageAuthorRequiredError,
     MessageDeleteForbiddenError,
     MessageEditTimeExpiredError,
     MessageEmptyError,
     MessageIdsEmptyError,
     MessageIdInvalidError,
     MessageNotModifiedError,
     MessageTooLongError,
     MsgWaitFailedError,
     MtSendQueueTooLongError,
     NeedChatInvalidError,
     NeedMemberInvalidError,
     NewSaltInvalidError,
     NewSettingsInvalidError,
     OffsetInvalidError,
     OffsetPeerIdInvalidError,
     OptionsTooMuchError,
     PackShortNameInvalidError,
     PackShortNameOccupiedError,
     ParticipantsTooFewError,
     ParticipantCallFailedError,
     ParticipantVersionOutdatedError,
     PasswordEmptyError,
     PasswordHashInvalidError,
     PasswordRequiredError,
     PaymentProviderInvalidError,
     PeerFloodError,
     PeerIdInvalidError,
     PeerIdNotSupportedError,
     PersistentTimestampEmptyError,
     PersistentTimestampInvalidError,
     PersistentTimestampOutdatedError,
     PhoneCodeEmptyError,
     PhoneCodeExpiredError,
     PhoneCodeHashEmptyError,
     PhoneCodeInvalidError,
     PhoneNumberAppSignupForbiddenError,
     PhoneNumberBannedError,
     PhoneNumberFloodError,
     PhoneNumberInvalidError,
     PhoneNumberOccupiedError,
     PhoneNumberUnoccupiedError,
     PhonePasswordFloodError,
     PhonePasswordProtectedError,
     PhotoContentUrlEmptyError,
     PhotoCropSizeSmallError,
     PhotoExtInvalidError,
     PhotoInvalidError,
     PhotoInvalidDimensionsError,
     PhotoSaveFileInvalidError,
     PhotoThumbUrlEmptyError,
     PinRestrictedError,
     PollOptionDuplicateError,
     PollUnsupportedError,
     PrivacyKeyInvalidError,
     PtsChangeEmptyError,
     QueryIdEmptyError,
     QueryIdInvalidError,
     QueryTooShortError,
     RandomIdDuplicateError,
     RandomIdInvalidError,
     RandomLengthInvalidError,
     RangesInvalidError,
     ReactionEmptyError,
     ReactionInvalidError,
     RegIdGenerateFailedError,
     ReplyMarkupInvalidError,
     ReplyMarkupTooLongError,
     ResultIdDuplicateError,
     ResultTypeInvalidError,
     ResultsTooMuchError,
     RightForbiddenError,
     RpcCallFailError,
     RpcMcgetFailError,
     RsaDecryptFailedError,
     ScheduleDateTooLateError,
     ScheduleTooMuchError,
     SearchQueryEmptyError,
     SecondsInvalidError,
     SendMessageMediaInvalidError,
     SendMessageTypeInvalidError,
     SessionExpiredError,
     SessionPasswordNeededError,
     SessionRevokedError,
     Sha256HashInvalidError,
     ShortnameOccupyFailedError,
     StartParamEmptyError,
     StartParamInvalidError,
     StickersetInvalidError,
     StickersEmptyError,
     StickerEmojiInvalidError,
     StickerFileInvalidError,
     StickerIdInvalidError,
     StickerInvalidError,
     StickerPngDimensionsError,
     StorageCheckFailedError,
     StoreInvalidScalarTypeError,
     TakeoutInvalidError,
     TakeoutRequiredError,
     TempAuthKeyEmptyError,
     TimeoutError,
     TmpPasswordDisabledError,
     TokenInvalidError,
     TtlDaysInvalidError,
     TypesEmptyError,
     TypeConstructorInvalidError,
     UnknownMethodError,
     UntilDateInvalidError,
     UrlInvalidError,
     UsernameInvalidError,
     UsernameNotModifiedError,
     UsernameNotOccupiedError,
     UsernameOccupiedError,
     UsersTooFewError,
     UsersTooMuchError,
     UserAdminInvalidError,
     UserAlreadyParticipantError,
     UserBannedInChannelError,
     UserBlockedError,
     UserBotError,
     UserBotInvalidError,
     UserBotRequiredError,
     UserChannelsTooMuchError,
     UserCreatorError,
     UserDeactivatedError,
     UserDeactivatedBanError,
     UserIdInvalidError,
     UserInvalidError,
     UserIsBlockedError,
     UserIsBotError,
     UserKickedError,
     UserNotMutualContactError,
     UserNotParticipantError,
     UserPrivacyRestrictedError,
     UserRestrictedError,
     VideoContentTypeInvalidError,
     WallpaperFileInvalidError,
     WallpaperInvalidError,
     WcConvertUrlInvalidError,
     WebpageCurlFailedError,
     WebpageMediaEmptyError,
     WorkerBusyTooLongRetryError,
     YouBlockedUserError,
     rpcErrorsObject,
     rpcErrorRe,
}
