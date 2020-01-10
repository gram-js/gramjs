<<<<<<< HEAD
import { GramJsApi, gramJsApi, MTProto } from '../../lib/gramjs';
import { OnApiUpdate } from './types';
=======
import { Api as GramJs, connection } from '../../lib/gramjs';
import { OnApiUpdate } from '../types';
>>>>>>> 48d2d818... Support reconnect and re-sync

import { buildApiMessage, buildApiMessageFromShort, buildApiMessageFromShortChat } from './builders/messages';
import { getApiChatIdFromMtpPeer } from './builders/chats';
import { buildApiUserStatus } from './builders/users';
import localDb from './localDb';
import { UNSUPPORTED_RESPONSE } from './utils';

const { constructors: ctors, requests } = gramJsApi;

let onUpdate: OnApiUpdate;

export function init(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

<<<<<<< HEAD
export function onGramJsUpdate(update: AnyLiteral, originRequest?: InstanceType<GramJsApi.AnyRequest>) {
  if (
    update instanceof ctors.UpdateNewMessage
    || update instanceof ctors.UpdateShortChatMessage
    || update instanceof ctors.UpdateShortMessage
    // TODO UpdateNewChannelMessage
=======
export function onGramJsUpdate(update: GramJs.TypeUpdate | GramJs.TypeUpdates, originRequest?: GramJs.AnyRequest) {
  if (update instanceof connection.UpdateConnectionState) {
    const connectionState = update.state === connection.UpdateConnectionState.states.disconnected
      ? 'connectionStateConnecting'
      : 'connectionStateReady';

    onUpdate({
      '@type': 'updateConnectionState',
      connection_state: {
        '@type': connectionState,
      },
    });

    // Messages
  } else if (
    update instanceof GramJs.UpdateNewMessage
    || update instanceof GramJs.UpdateNewChannelMessage
    || update instanceof GramJs.UpdateShortChatMessage
    || update instanceof GramJs.UpdateShortMessage
>>>>>>> 48d2d818... Support reconnect and re-sync
  ) {
    let message;

    if (update instanceof ctors.UpdateNewMessage) {
      message = buildApiMessage(update.message);
    } else if (update instanceof ctors.UpdateShortChatMessage) {
      message = buildApiMessageFromShortChat(update);
    } else if (update instanceof ctors.UpdateShortMessage) {
      message = buildApiMessageFromShort(update);
    } else {
      throw new Error(UNSUPPORTED_RESPONSE);
    }

    onUpdate({
      '@type': 'updateMessage',
      id: message.id,
      chat_id: message.chat_id,
      message,
    });

    onUpdate({
      '@type': 'updateChat',
      id: message.chat_id,
      chat: {
        last_message: message,
      },
    });
  } else if (
    (originRequest instanceof requests.messages.SendMessageRequest)
    && (
      update instanceof ctors.UpdateMessageID
      || update instanceof ctors.UpdateShortSentMessage
    )
  ) {
    const { randomId } = originRequest;
    const localMessage = localDb.localMessages[randomId!.toString()];
    if (!localMessage) {
      throw new Error('Local message not found');
    }

    onUpdate({
      '@type': 'updateMessageSendSucceeded',
      chat_id: localMessage.chat_id,
      old_message_id: localMessage.id,
      message: {
        ...localMessage,
        id: update.id,
        sending_state: undefined,
      },
    });
  } else if (update instanceof ctors.UpdateReadHistoryInbox) {
    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer(update.peer),
      chat: {
        last_read_inbox_message_id: update.maxId,
        unread_count: update.stillUnreadCount,
      },
    });
  } else if (update instanceof ctors.UpdateReadHistoryOutbox) {
    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer(update.peer),
      chat: {
        last_read_outbox_message_id: update.maxId,
      },
    });
  } else if (update instanceof ctors.UpdateReadChannelInbox) {
    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer({ channelId: update.channelId } as MTProto.Peer),
      chat: {
        last_read_inbox_message_id: update.maxId,
        unread_count: update.stillUnreadCount,
      },
    });
  } else if (update instanceof ctors.UpdateReadChannelOutbox) {
    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer({ channelId: update.channelId } as MTProto.Peer),
      chat: {
        last_read_outbox_message_id: update.maxId,
      },
    });
  } else if (update instanceof ctors.UpdateUserStatus) {
    onUpdate({
      '@type': 'updateUser',
      id: update.userId,
      user: {
        status: buildApiUserStatus(update.status),
      },
    });
    // TODO @gramjs This one never comes for some reason. `UpdatePinnedDialogs` comes instead.
    // } else if (update instanceof ctors.UpdateDialogPinned) {
    //   onUpdate({
    //     '@type': 'updateChat',
    //     id: getApiChatIdFromMtpPeer(update.peer),
    //     chat: {
    //       is_pinned: update.pinned || false,
    //     },
    //   });
  }
}
