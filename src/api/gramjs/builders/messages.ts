import * as gramJsApi from '../../../lib/gramjs/tl/types';
import { strippedPhotoToJpg } from '../../../lib/gramjs/Utils';
import {
  ApiMessage, ApiMessageForwardInfo, ApiPhoto, ApiPhotoCachedSize, ApiPhotoSize, ApiSticker,
} from '../../types';
import { OmitFlags } from '../types/types';

import { getApiChatIdFromMtpPeer } from './chats';
import { isPeerUser } from './peers';
import { bytesToDataUri } from './common';

// TODO Maybe we do not need it.
const DEFAULT_USER_ID = 0;

export function buildApiMessage(mtpMessage: OmitFlags<MTP.message>): ApiMessage {
  const isPrivateToMe = mtpMessage.out !== true && isPeerUser(mtpMessage.toId);
  const chatId = isPrivateToMe
    ? (mtpMessage.fromId || DEFAULT_USER_ID)
    : getApiChatIdFromMtpPeer(mtpMessage.toId);

  return buildApiMessageWithChatId(chatId, mtpMessage);
}

export function buildApiMessageFromShort(
  mtpMessage: OmitFlags<MTP.updateShortMessage>,
): ApiMessage {
  const chatId = getApiChatIdFromMtpPeer({ userId: mtpMessage.userId });

  return buildApiMessageWithChatId(chatId, {
    ...mtpMessage,
    // TODO Current user ID needed here.
    fromId: mtpMessage.out ? DEFAULT_USER_ID : mtpMessage.userId,
  });
}

export function buildApiMessageFromShortChat(
  mtpMessage: OmitFlags<MTP.updateShortChatMessage>,
): ApiMessage {
  const chatId = getApiChatIdFromMtpPeer({ chatId: mtpMessage.chatId });

  return buildApiMessageWithChatId(chatId, mtpMessage);
}

export function buildApiMessageWithChatId(
  chatId: number,
  mtpMessage: Pick<MTP.message, 'id' | 'out' | 'message' | 'date' | 'fromId' | 'fwdFrom' | 'replyToMsgId' | 'media'>,
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
    is_outgoing: mtpMessage.out === true,
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

function buildApiMessageForwardInfo(fwdFrom: MTP.messageFwdHeader): ApiMessageForwardInfo {
  return {
    '@type': 'messageForwardInfo',
    from_chat_id: fwdFrom.fromId,
    origin: {
      '@type': 'messageForwardOriginUser',
      // TODO Handle when empty `fromId`.
      sender_user_id: fwdFrom.fromId!,
      // TODO @gramjs Not supported?
      // sender_user_name: fwdFrom.fromName,
    },
  };
}

function buildSticker(media: MTP.MessageMedia): ApiSticker | null {
  if (!(media instanceof gramJsApi.MessageMediaDocument)) {
    return null;
  }

  const stickerAttribute = media.document.attributes
    .find((attr: any) => attr instanceof gramJsApi.DocumentAttributeSticker);

  if (!stickerAttribute) {
    return null;
  }

  const emoji = stickerAttribute.alt;
  const isAnimated = media.document.mimeType === 'application/x-tgsticker';
  const thumb = media.document.thumbs.find((s: any) => s instanceof gramJsApi.PhotoCachedSize);
  const thumbnail = thumb && buildApiPhotoCachedSize(thumb);
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

function buildPhoto(media: MTP.MessageMedia): ApiPhoto | null {
  if (!(media instanceof gramJsApi.MessageMediaPhoto)) {
    return null;
  }

  const hasStickers = media.photo.has_stickers;
  const thumb = media.photo.sizes.find((s: any) => s instanceof gramJsApi.PhotoStrippedSize);
  const mSize = media.photo.sizes.find((s: any) => s.type === 'm');
  const { width, height } = mSize;
  const minithumbnail: ApiPhoto['minithumbnail'] = thumb && {
    '@type': 'minithumbnail',
    data: bytesToDataUri(strippedPhotoToJpg(thumb.bytes as Buffer), true),
    width,
    height,
  };
  const sizes = media.photo.sizes.filter((s: any) => s instanceof gramJsApi.PhotoSize).map(buildApiPhotoSize);

  return {
    '@type': 'photo',
    has_stickers: hasStickers,
    minithumbnail,
    sizes,
  };
}

function buildApiPhotoCachedSize(photoSize: MTP.photoCachedSize): ApiPhotoCachedSize {
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

function buildApiPhotoSize(photoSize: MTP.photoSize): ApiPhotoSize {
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
