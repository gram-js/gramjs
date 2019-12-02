import { gramJsApi, MTProto } from '../../../lib/gramjs';

import { OnApiUpdate } from '../types';
import { invokeRequest } from '../client';
import { buildApiChatFromDialog, getApiChatIdFromMtpPeer, getPeerKey } from '../builders/chats';
import { buildApiMessage } from '../builders/messages';
import { buildApiUser } from '../builders/users';
import { buildCollectionByKey } from '../../../util/iteratees';
import { loadAvatar } from './files';
import localDb from '../localDb';
import { UNSUPPORTED_RESPONSE } from '../utils';

const { constructors: ctors, requests } = gramJsApi;

let onUpdate: OnApiUpdate;

export function init(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

export async function fetchChats(
  {
    limit,
    offsetDate,
  }: {
    limit: number;
    offsetDate?: number;
  },
): Promise<{ chat_ids: number[] } | null> {
  const result = await invokeRequest(new requests.messages.GetDialogsRequest({
    offsetPeer: new ctors.InputPeerEmpty({}),
    limit,
    offsetDate,
  }));

  if (!result || !(result instanceof ctors.messages.DialogsSlice) || !result.dialogs.length) {
    throw new Error(UNSUPPORTED_RESPONSE);
  }

  updateLocalDb(result);

  const lastMessagesByChatId = buildCollectionByKey(result.messages.map(buildApiMessage), 'chat_id');
  const peersByKey = preparePeers(result);
  const chats = result.dialogs.map((dialog) => {
    const peerEntity = peersByKey[getPeerKey(dialog.peer)];
    const chat = buildApiChatFromDialog(dialog as MTProto.dialog, peerEntity);
    chat.last_message = lastMessagesByChatId[chat.id];
    return chat;
  });

  onUpdate({
    '@type': 'chats',
    chats,
  });

  const users = (result.users as MTProto.user[]).map(buildApiUser);
  onUpdate({
    '@type': 'users',
    users,
  });

  loadAvatars(result);

  const chatIds = chats.map((chat) => chat.id);

  return {
    chat_ids: chatIds,
  };
}

function preparePeers(result: MTProto.messages_dialogsSlice) {
  const store: Record<string, MTProto.chat | MTProto.user> = {};

  result.chats.forEach((chat) => {
    store[`chat${chat.id}`] = chat as MTProto.chat;
  });

  result.users.forEach((user) => {
    store[`user${user.id}`] = user as MTProto.user;
  });

  return store;
}

function updateLocalDb(result: MTProto.messages_dialogsSlice) {
  result.users.forEach((user) => {
    localDb.users[user.id] = user as MTProto.user;
  });

  result.chats.forEach((chat) => {
    localDb.chats[chat.id] = chat as MTProto.chat | MTProto.channel;
  });
}

function loadAvatars(result: MTProto.messages_dialogsSlice) {
  result.users.forEach((user) => {
    loadAvatar(user as MTProto.user).then((dataUri) => {
      if (!dataUri) {
        return;
      }

      onUpdate({
        '@type': 'updateAvatar',
        chat_id: getApiChatIdFromMtpPeer({ userId: user.id } as MTProto.Peer),
        data_uri: dataUri,
      });
    });
  });

  result.chats.forEach((chat) => {
    loadAvatar(chat as MTProto.chat).then((dataUri) => {
      if (!dataUri) {
        return;
      }

      onUpdate({
        '@type': 'updateAvatar',
        chat_id: getApiChatIdFromMtpPeer({ chatId: chat.id } as MTProto.Peer),
        data_uri: dataUri,
      });
    });
  });
}
