import { Api as GramJs, connection } from '../../lib/gramjs';
import { ApiMessage, ApiUpdateConnectionStateType, OnApiUpdate } from '../types';

import { pick } from '../../util/iteratees';
import {
  buildApiMessage,
  buildApiMessageFromShort,
  buildApiMessageFromShortChat,
  buildMessageMediaContent,
  buildMessageTextContent,
  resolveMessageApiChatId,
  buildPoll,
  buildPollResults,
  buildApiMessageFromNotification,
} from './apiBuilders/messages';
import {
  getApiChatIdFromMtpPeer,
  buildChatMember,
  buildChatMembers,
  buildChatTypingStatus,
  buildAvatar,
  buildApiChatFromPreview,
} from './apiBuilders/chats';
import { buildApiUser, buildApiUserStatus } from './apiBuilders/users';
import {
  buildMessageFromUpdateShortSent,
  isMessageWithMedia,
  buildChatPhotoForLocalDb,
  buildNotificationMessageForLocalDb,
} from './gramjsBuilders';
import localDb from './localDb';
import { omitVirtualClassFields } from './apiBuilders/helpers';
import { SERVICE_NOTIFICATIONS_USER_ID } from '../../config';

type Update = (
  (GramJs.TypeUpdate | GramJs.TypeUpdates) & { _entities?: (GramJs.TypeUser | GramJs.TypeChat)[] }
) | typeof connection.UpdateConnectionState;

let onUpdate: OnApiUpdate;
let currentUserId: number | undefined;

export function init(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

export function setUpdaterCurrentUserId(_currentUserId: number) {
  currentUserId = _currentUserId;
}

export function updater(update: Update, originRequest?: GramJs.AnyRequest) {
  if (update instanceof connection.UpdateConnectionState) {
    let connectionState: ApiUpdateConnectionStateType;

    switch (update.state) {
      case connection.UpdateConnectionState.states.disconnected:
        connectionState = 'connectionStateConnecting';
        break;
      case connection.UpdateConnectionState.states.broken:
        connectionState = 'connectionStateBroken';
        break;
      case connection.UpdateConnectionState.states.connected:
      default:
        connectionState = 'connectionStateReady';
        break;
    }

    onUpdate({
      '@type': 'updateConnectionState',
      connectionState,
    });

    // Messages
  } else if (
    update instanceof GramJs.UpdateNewMessage
    || update instanceof GramJs.UpdateNewChannelMessage
    || update instanceof GramJs.UpdateShortChatMessage
    || update instanceof GramJs.UpdateShortMessage
    || update instanceof GramJs.UpdateServiceNotification
  ) {
    let message: ApiMessage | undefined;

    if (update instanceof GramJs.UpdateShortChatMessage) {
      message = buildApiMessageFromShortChat(update);
    } else if (update instanceof GramJs.UpdateShortMessage) {
      message = buildApiMessageFromShort(update, currentUserId!);
    } else if (update instanceof GramJs.UpdateServiceNotification) {
      const currentDate = Date.now();
      message = buildApiMessageFromNotification(update, currentDate);

      if (isMessageWithMedia(update)) {
        localDb.messages[SERVICE_NOTIFICATIONS_USER_ID] = buildNotificationMessageForLocalDb(
          update,
          message.id,
          currentDate,
          currentUserId!,
        );
      }
    } else {
      if (update.message instanceof GramJs.Message && isMessageWithMedia(update.message)) {
        const messageFullId = `${resolveMessageApiChatId(update.message)}-${update.message.id}`;
        localDb.messages[messageFullId] = update.message;
      }

      message = buildApiMessage(update.message)!;
    }

    // eslint-disable-next-line no-underscore-dangle
    const entities = update._entities;
    if (entities && entities.length) {
      entities
        .filter((e) => e instanceof GramJs.User)
        .map(buildApiUser)
        .forEach((user) => {
          if (!user) {
            return;
          }

          onUpdate({
            '@type': 'updateUser',
            id: user.id,
            user,
          });
        });
    }

    onUpdate({
      '@type': 'newMessage',
      id: message.id,
      chatId: message.chatId,
      message,
    });

    // Some updates to a Chat/Channel don't have a dedicated update class.
    // We can get info on some updates from Service Messages.
    if (update.message instanceof GramJs.MessageService) {
      const { action } = update.message;

      if (action instanceof GramJs.MessageActionChatEditTitle) {
        onUpdate({
          '@type': 'updateChat',
          id: message.chatId,
          chat: {
            title: action.title,
          },
        });
      } else if (action instanceof GramJs.MessageActionChatEditPhoto) {
        const photo = buildChatPhotoForLocalDb(action.photo);
        const avatar = buildAvatar(photo);

        const localDbChatId = Math.abs(resolveMessageApiChatId(update.message)!);
        localDb.chats[localDbChatId].photo = photo;

        if (avatar) {
          onUpdate({
            '@type': 'updateChat',
            id: message.chatId,
            chat: { avatar },
          });
        }
      } else if (action instanceof GramJs.MessageActionChatDeletePhoto) {
        const localDbChatId = Math.abs(resolveMessageApiChatId(update.message)!);
        localDb.chats[localDbChatId].photo = new GramJs.ChatPhotoEmpty();

        onUpdate({
          '@type': 'updateChat',
          id: message.chatId,
          chat: { avatar: undefined },
        });
      } else if (action instanceof GramJs.MessageActionChatDeleteUser) {
        // eslint-disable-next-line no-underscore-dangle
        if (update._entities && update._entities.some((e): e is GramJs.User => (
          e instanceof GramJs.User && !!e.self && e.id === action.userId
        ))) {
          onUpdate({
            '@type': 'updateChatLeave',
            id: message.chatId,
          });
        }
      } else if (action instanceof GramJs.MessageActionChatAddUser) {
        // eslint-disable-next-line no-underscore-dangle
        if (update._entities && update._entities.some((e): e is GramJs.User => (
          e instanceof GramJs.User && !!e.self && action.users.includes(e.id)
        ))) {
          onUpdate({
            '@type': 'updateChatJoin',
            id: message.chatId,
          });
        }
      }
    }
  } else if (
    update instanceof GramJs.UpdateEditMessage
    || update instanceof GramJs.UpdateEditChannelMessage
  ) {
    if (update.message instanceof GramJs.Message) {
      const messageFullId = `${resolveMessageApiChatId(update.message)}-${update.message.id}`;
      localDb.messages[messageFullId] = update.message;
    }

    const message = buildApiMessage(update.message)!;

    onUpdate({
      '@type': 'updateMessage',
      id: message.id,
      chatId: message.chatId,
      message,
    });
  } else if (
    update instanceof GramJs.UpdateDeleteMessages
    || update instanceof GramJs.UpdateDeleteChannelMessages
  ) {
    onUpdate({
      '@type': 'deleteMessages',
      ids: update.messages,
      ...((update instanceof GramJs.UpdateDeleteChannelMessages) && {
        chatId: getApiChatIdFromMtpPeer({ channelId: update.channelId } as GramJs.PeerChannel),
      }),
    });
  } else if ((
    originRequest instanceof GramJs.messages.SendMessage
    || originRequest instanceof GramJs.messages.SendMedia
    || originRequest instanceof GramJs.messages.ForwardMessages
  ) && (
    update instanceof GramJs.UpdateMessageID
    || update instanceof GramJs.UpdateShortSentMessage
  )) {
    const { randomId } = originRequest;
    const localMessage = localDb.localMessages[randomId.toString()];
    if (!localMessage) {
      throw new Error('Local message not found');
    }

    let newContent: ApiMessage['content'] | undefined;
    if (update instanceof GramJs.UpdateShortSentMessage) {
      if (localMessage.content.text && update.entities) {
        newContent = {
          text: buildMessageTextContent(localMessage.content.text.text, update.entities),
        };
      }
      if (update.media) {
        newContent = {
          ...newContent,
          ...buildMessageMediaContent(update.media),
        };
      }

      const mtpMessage = buildMessageFromUpdateShortSent(update.id, localMessage.chatId, update);
      const messageFullId = `${localMessage.chatId}-${update.id}`;
      localDb.messages[messageFullId] = mtpMessage;
    }

    onUpdate({
      '@type': 'updateMessageSendSucceeded',
      chatId: localMessage.chatId,
      localId: localMessage.id,
      message: {
        ...localMessage,
        ...(newContent && {
          content: {
            ...localMessage.content,
            ...newContent,
          },
        }),
        id: update.id,
        sendingState: undefined,
        ...('date' in update && { date: update.date }),
      },
    });
  } else if (update instanceof GramJs.UpdateReadMessagesContents) {
    onUpdate({
      '@type': 'updateCommonBoxMessages',
      ids: update.messages,
      messageUpdate: {
        hasUnreadMention: false,
        isMediaUnread: false,
      },
    });
  } else if (update instanceof GramJs.UpdateChannelReadMessagesContents) {
    onUpdate({
      '@type': 'updateChannelMessages',
      channelId: update.channelId,
      ids: update.messages,
      messageUpdate: {
        hasUnreadMention: false,
        isMediaUnread: false,
      },
    });
  } else if (update instanceof GramJs.UpdateMessagePoll) {
    const { pollId, poll, results } = update;
    if (poll) {
      const apiPoll = buildPoll(poll, results);

      onUpdate({
        '@type': 'updateMessagePoll',
        pollId: pollId.toString(),
        pollUpdate: apiPoll,
      });
    } else {
      const pollResults = buildPollResults(results);
      onUpdate({
        '@type': 'updateMessagePoll',
        pollId: pollId.toString(),
        pollUpdate: { results: pollResults },
      });
    }
  } else if (update instanceof GramJs.UpdateMessagePollVote) {
    onUpdate({
      '@type': 'updateMessagePollVote',
      pollId: update.pollId.toString(),
      userId: update.userId,
      options: update.options.map((option) => String.fromCharCode(...option)),
    });
  } else if (update instanceof GramJs.UpdateChannelMessageViews) {
    onUpdate({
      '@type': 'updateMessage',
      chatId: getApiChatIdFromMtpPeer({ channelId: update.channelId } as GramJs.PeerChannel),
      id: update.id,
      message: { views: update.views },
    });

    // Chats
  } else if (update instanceof GramJs.UpdateReadHistoryInbox) {
    onUpdate({
      '@type': 'updateChatInbox',
      id: getApiChatIdFromMtpPeer(update.peer),
      chat: {
        lastReadInboxMessageId: update.maxId,
        unreadCount: update.stillUnreadCount,
      },
    });
  } else if (update instanceof GramJs.UpdateReadHistoryOutbox) {
    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer(update.peer),
      chat: {
        lastReadOutboxMessageId: update.maxId,
      },
    });
  } else if (update instanceof GramJs.UpdateReadChannelInbox) {
    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer({ channelId: update.channelId } as GramJs.PeerChannel),
      chat: {
        lastReadInboxMessageId: update.maxId,
        unreadCount: update.stillUnreadCount,
      },
    });
  } else if (update instanceof GramJs.UpdateReadChannelOutbox) {
    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer({ channelId: update.channelId } as GramJs.PeerChannel),
      chat: {
        lastReadOutboxMessageId: update.maxId,
      },
    });
  } else if (
    update instanceof GramJs.UpdateDialogPinned
    && update.peer instanceof GramJs.DialogPeer
  ) {
    onUpdate({
      '@type': 'updateChatPinned',
      id: getApiChatIdFromMtpPeer(update.peer.peer),
      isPinned: update.pinned || false,
    });
  } else if (update instanceof GramJs.UpdatePinnedDialogs) {
    const ids = update.order
      ? update.order
        .filter((dp): dp is GramJs.DialogPeer => dp instanceof GramJs.DialogPeer)
        .map((dp) => getApiChatIdFromMtpPeer(dp.peer))
      : [];

    onUpdate({
      '@type': 'updatePinnedChatIds',
      ids,
    });
  } else if (update instanceof GramJs.UpdateChatParticipants) {
    const replacedMembers = buildChatMembers(update.participants);

    onUpdate({
      '@type': 'updateChatMembers',
      id: getApiChatIdFromMtpPeer({ chatId: update.participants.chatId } as GramJs.TypePeer),
      replacedMembers,
    });
  } else if (update instanceof GramJs.UpdateChatParticipantAdd) {
    const addedMember = buildChatMember(
      pick(update, ['userId', 'inviterId', 'date']) as GramJs.ChatParticipant,
    );

    onUpdate({
      '@type': 'updateChatMembers',
      id: getApiChatIdFromMtpPeer({ chatId: update.chatId } as GramJs.PeerChat),
      addedMember,
    });
  } else if (update instanceof GramJs.UpdateChatParticipantDelete) {
    const { userId: deletedMemberId } = update;

    onUpdate({
      '@type': 'updateChatMembers',
      id: getApiChatIdFromMtpPeer({ chatId: update.chatId } as GramJs.PeerChat),
      deletedMemberId,
    });
  } else if (
    update instanceof GramJs.UpdateChatPinnedMessage
    || update instanceof GramJs.UpdateChannelPinnedMessage
  ) {
    const id = update instanceof GramJs.UpdateChatPinnedMessage
      ? getApiChatIdFromMtpPeer({ chatId: update.chatId } as GramJs.PeerChat)
      : getApiChatIdFromMtpPeer({ channelId: update.channelId } as GramJs.PeerChannel);

    onUpdate({
      '@type': 'updateChatFullInfo',
      id,
      fullInfo: {
        pinnedMessageId: update.id,
      },
    });
  } else if (
    update instanceof GramJs.UpdateNotifySettings
    && update.peer instanceof GramJs.NotifyPeer
  ) {
    const { silent, muteUntil } = update.notifySettings;

    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer(update.peer.peer),
      chat: {
        isMuted: silent || (typeof muteUntil === 'number' && Date.now() < muteUntil * 1000),
      },
    });
  } else if (
    update instanceof GramJs.UpdateUserTyping
    || update instanceof GramJs.UpdateChatUserTyping
  ) {
    const id = update instanceof GramJs.UpdateUserTyping
      ? update.userId
      : getApiChatIdFromMtpPeer({ chatId: update.chatId } as GramJs.PeerChat);

    onUpdate({
      '@type': 'updateChatTypingStatus',
      id,
      typingStatus: buildChatTypingStatus(update),
    });
  } else if (update instanceof GramJs.UpdateChannel) {
    const { _entities } = update;
    if (_entities) {
      const channel = _entities.find((e): e is GramJs.Channel => (e instanceof GramJs.Channel));
      const isForbidden = _entities.some((e) => e instanceof GramJs.ChannelForbidden);
      const isVisible = !(isForbidden || (channel && channel.left));
      // When `chatUpdate` is built from a preview,
      // it can have an incorrect type of `channel` for supergroup chats.
      // Since chat entitiy can't change its type anyway, we can safely ignore it.
      const chat = channel && buildApiChatFromPreview(channel, true);

      if (chat) {
        onUpdate({
          '@type': 'updateChat',
          id: chat.id,
          chat,
        });
      }

      onUpdate({
        '@type': isVisible ? 'updateChatJoin' : 'updateChatLeave',
        id: getApiChatIdFromMtpPeer({ channelId: update.channelId } as GramJs.PeerChannel),
      });
    }
  } else if (update instanceof GramJs.UpdateChatDefaultBannedRights) {
    onUpdate({
      '@type': 'updateChat',
      id: getApiChatIdFromMtpPeer(update.peer),
      chat: {
        defaultBannedRights: omitVirtualClassFields(update.defaultBannedRights),
      },
    });

    // Users
  } else if (update instanceof GramJs.UpdateUserStatus) {
    onUpdate({
      '@type': 'updateUser',
      id: update.userId,
      user: {
        status: buildApiUserStatus(update.status),
      },
    });
  } else if (update instanceof GramJs.UpdateUserName) {
    const updatedUser = localDb.users[update.userId];
    const user = updatedUser && updatedUser.mutualContact && !updatedUser.self
      ? pick(update, ['username'])
      : pick(update, ['firstName', 'lastName', 'username']);

    onUpdate({
      '@type': 'updateUser',
      id: update.userId,
      user,
    });
  } else if (update instanceof GramJs.UpdateUserPhoto) {
    const { userId, photo } = update;
    const avatar = buildAvatar(photo);

    localDb.users[userId].photo = photo;

    onUpdate({
      '@type': 'updateUser',
      id: userId,
      user: { avatar },
    });
  } else if (update instanceof GramJs.UpdateUserPhone) {
    const { userId, phone } = update;

    onUpdate({
      '@type': 'updateUser',
      id: userId,
      user: { phoneNumber: phone },
    });
  } else if (update instanceof GramJs.UpdateUserPinnedMessage) {
    onUpdate({
      '@type': 'updateUserFullInfo',
      id: update.userId,
      fullInfo: {
        pinnedMessageId: update.id,
      },
    });

    // Misc
  } else if (update instanceof GramJs.UpdateContactsReset) {
    onUpdate({ '@type': 'updateResetContactList' });
  }
}

export function handleError(err: Error) {
  onUpdate({
    '@type': 'error',
    error: pick(err, ['message']),
  });
}
