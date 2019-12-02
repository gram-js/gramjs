import { gramJsApi, MTProto } from '../../../lib/gramjs';
import { strippedPhotoToJpg } from '../../../lib/gramjs/Utils';
import {
  ApiMessage, ApiMessageForwardInfo, ApiPhoto, ApiPhotoCachedSize, ApiPhotoSize, ApiSticker,
} from '../../types';

import { getApiChatIdFromMtpPeer } from './chats';
import { isPeerUser } from './peers';
import { bytesToDataUri } from './common';

const ctors = gramJsApi.constructors;

// TODO Maybe we do not need it.
const DEFAULT_USER_ID = 0;

export function buildApiMessage(mtpMessage: MTProto.Message): ApiMessage {
  if (
    !(mtpMessage instanceof ctors.Message)
    && !(mtpMessage instanceof ctors.MessageService)) {
    throw new Error('Not supported');
  }

  const isPrivateToMe = mtpMessage.out !== true && isPeerUser(mtpMessage.toId);
  const chatId = isPrivateToMe
    ? (mtpMessage.fromId || DEFAULT_USER_ID)
    : getApiChatIdFromMtpPeer(mtpMessage.toId);

  return buildApiMessageWithChatId(chatId, mtpMessage);
}

export function buildApiMessageFromShort(
  mtpMessage: MTProto.updateShortMessage,
): ApiMessage {
  const chatId = getApiChatIdFromMtpPeer({ userId: mtpMessage.userId } as MTProto.Peer);

  return buildApiMessageWithChatId(chatId, {
    ...mtpMessage,
    // TODO Current user ID needed here.
    fromId: mtpMessage.out ? DEFAULT_USER_ID : mtpMessage.userId,
  });
}

export function buildApiMessageFromShortChat(
  mtpMessage: MTProto.updateShortChatMessage,
): ApiMessage {
  const chatId = getApiChatIdFromMtpPeer({ chatId: mtpMessage.chatId } as MTProto.Peer);

  return buildApiMessageWithChatId(chatId, mtpMessage);
}

export function buildApiMessageWithChatId(
  chatId: number,
  mtpMessage: Pick<MTProto.message, (
    'id' | 'out' | 'message' | 'date' | 'fromId' | 'fwdFrom' | 'replyToMsgId' | 'media'
  )>,
): ApiMessage {
  const sticker = mtpMessage.media && buildSticker(mtpMessage.media);
  const photo = mtpMessage.media && buildPhoto(mtpMessage.media);
  const textContent = mtpMessage.message && {
    '@type': 'formattedText' as 'formattedText',
    text: mtpMessage.message,
  };
  const caption = textContent && photo ? textContent : null;
  const text = textContent && !photo ? textContent : null;

  return {
    id: mtpMessage.id,
    chat_id: chatId,
    is_outgoing: Boolean(mtpMessage.out),
    content: {
      '@type': 'message',
      ...(text && { text }),
      ...(sticker && { sticker }),
      ...(photo && { photo }),
      ...(caption && { caption }),
    },
    date: mtpMessage.date,
    sender_user_id: mtpMessage.fromId || DEFAULT_USER_ID,
    reply_to_message_id: mtpMessage.replyToMsgId,
    ...(mtpMessage.fwdFrom && { forward_info: buildApiMessageForwardInfo(mtpMessage.fwdFrom) }),
  };
}

function buildApiMessageForwardInfo(fwdFrom: MTProto.messageFwdHeader): ApiMessageForwardInfo {
  return {
    '@type': 'messageForwardInfo',
    from_chat_id: fwdFrom.fromId,
    origin: {
      '@type': 'messageForwardOriginUser',
      // TODO Handle when empty `fromId`.
      sender_user_id: fwdFrom.fromId,
      // TODO @gramjs Not supported?
      // sender_user_name: fwdFrom.fromName,
    },
  };
}

function buildSticker(media: MTProto.MessageMedia): ApiSticker | null {
  if (
    !(media instanceof ctors.MessageMediaDocument)
    || !media.document
    || !(media.document instanceof ctors.Document)
  ) {
    return null;
  }

  const stickerAttribute = media.document.attributes
    .find((attr: any): attr is MTProto.documentAttributeSticker => (
      attr instanceof ctors.DocumentAttributeSticker
    ));

  if (!stickerAttribute) {
    return null;
  }

  const emoji = stickerAttribute.alt;
  const isAnimated = media.document.mimeType === 'application/x-tgsticker';
  const thumb = media.document.thumbs && media.document.thumbs.find((s: any) => s instanceof ctors.PhotoCachedSize);
  const thumbnail = thumb && buildApiPhotoCachedSize(thumb as MTProto.photoCachedSize);
  const { width, height } = thumbnail || {};

  return {
    '@type': 'sticker',
    emoji,
    is_animated: isAnimated,
    width,
    height,
    thumbnail,
  };
}

function buildPhoto(media: MTProto.MessageMedia): ApiPhoto | null {
  if (!(media instanceof ctors.MessageMediaPhoto) || !media.photo || !(media.photo instanceof ctors.Photo)) {
    return null;
  }

  const hasStickers = Boolean(media.photo.hasStickers);
  const thumb = media.photo.sizes.find((s: any) => s instanceof ctors.PhotoStrippedSize);
  const sizes = media.photo.sizes
    .filter((s: any): s is MTProto.photoSize => s instanceof ctors.PhotoSize)
    .map(buildApiPhotoSize);
  const mSize = sizes.find((s: any) => s.type === 'm');
  const { width, height } = mSize as ApiPhotoSize;
  const minithumbnail: ApiPhoto['minithumbnail'] = thumb && {
    '@type': 'minithumbnail',
    data: bytesToDataUri(strippedPhotoToJpg((thumb as MTProto.photoStrippedSize).bytes as Buffer), true),
    width,
    height,
  };

  return {
    '@type': 'photo',
    has_stickers: hasStickers,
    minithumbnail,
    sizes,
  };
}

function buildApiPhotoCachedSize(photoSize: MTProto.photoCachedSize): ApiPhotoCachedSize {
  const {
    w, h, type, bytes,
  } = photoSize;
  const dataUri = bytesToDataUri(strippedPhotoToJpg(bytes as Buffer));

  return {
    '@type': 'photoCachedSize',
    width: w,
    height: h,
    type: type as ('m' | 'x' | 'y'),
    dataUri,
  };
}

function buildApiPhotoSize(photoSize: MTProto.photoSize): ApiPhotoSize {
  const { w, h, type } = photoSize;

  return {
    '@type': 'photoSize',
    width: w,
    height: h,
    type: type as ('m' | 'x' | 'y'),
  };
}

// We only support 100000 local pending messages here and expect it will not interfere with real IDs.
let localMessageCounter = -1;

export function buildLocalMessage(chatId: number, text: string): ApiMessage {
  const localId = localMessageCounter--;

  return {
    id: localId,
    chat_id: chatId,
    content: {
      '@type': 'message',
      text: {
        '@type': 'formattedText',
        text,
      },
    },
    date: Math.round(Date.now() / 1000),
    is_outgoing: true,
    sender_user_id: DEFAULT_USER_ID, // TODO
    sending_state: {
      '@type': 'messageSendingStatePending',
    },
  };
}
