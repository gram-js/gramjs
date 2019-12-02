import { MTProto } from '../../../lib/gramjs';
import { ApiChat } from '../../types';
import { isPeerChat, isPeerUser } from './peers';
import { buildApiPhotoLocations } from './common';

export function buildApiChatFromDialog(dialog: MTProto.dialog, peerEntity: MTProto.user | MTProto.chat): ApiChat {
  return {
    id: getApiChatIdFromMtpPeer(dialog.peer),
    type: {
      '@type': getApiChatTypeFromMtpPeer(dialog.peer),
      ...(isPeerUser(dialog.peer) && { user_id: dialog.peer.userId }),
    },
    title: getApiChatTitleFromMtpPeer(dialog.peer, peerEntity),
    photo_locations: buildApiPhotoLocations(peerEntity),
    last_read_outbox_message_id: dialog.readOutboxMaxId,
    last_read_inbox_message_id: dialog.readInboxMaxId,
    unread_count: dialog.unreadCount,
    unread_mention_count: 0, // TODO
    is_pinned: dialog.pinned || false,
  };
}

export function getApiChatIdFromMtpPeer(peer: MTProto.Peer) {
  if (isPeerUser(peer)) {
    return peer.userId;
  } else if (isPeerChat(peer)) {
    return -peer.chatId;
  } else {
    return -peer.channelId;
  }
}

export function getApiChatTypeFromMtpPeer(peer: MTProto.Peer) {
  if (isPeerUser(peer)) {
    return 'chatTypePrivate';
  } else if (isPeerChat(peer)) {
    return 'chatTypeBasicGroup';
  } else {
    // TODO Support channels, supergroups, etc.
    return 'chatTypeBasicGroup';
  }
}

export function getPeerKey(peer: MTProto.Peer) {
  if (isPeerUser(peer)) {
    return `user${peer.userId}`;
  } else if (isPeerChat(peer)) {
    return `chat${peer.chatId}`;
  } else {
    return `chat${peer.channelId}`;
  }
}

export function getApiChatTitleFromMtpPeer(peer: MTProto.Peer, peerEntity: MTProto.user | MTProto.chat) {
  if (isPeerUser(peer)) {
    return getUserName(peerEntity as MTProto.user);
  } else {
    return (peerEntity as MTProto.chat).title;
  }
}

function getUserName(user: MTProto.user) {
  return user.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}` : undefined;
}
