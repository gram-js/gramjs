import * as gramJsApi from '../../../lib/gramjs/tl/types';

import { ApiMessage } from '../../types';
import { OnApiUpdate } from '../types/types';

import { invokeRequest } from '../client';
import { buildApiMessage, buildLocalMessage } from '../builders/messages';
import { buildApiUser } from '../builders/users';
import { buildInputPeer, generateRandomBigInt } from '../inputHelpers';
import localDb from '../localDb';
import { loadMessageMedia } from './files';

let onUpdate: OnApiUpdate;

export function init(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

export async function fetchMessages({ chatId, fromMessageId, limit }: {
  chatId: number;
  fromMessageId: number;
  limit: number;
}): Promise<{ messages: ApiMessage[] } | null> {
  const result = await invokeRequest({
    namespace: 'messages',
    name: 'GetHistoryRequest',
    args: {
      offsetId: fromMessageId,
      limit,
      peer: buildInputPeer(chatId),
    },
  }) as MTP.messages$Messages;

  if (!result || !result.messages) {
    return null;
  }

  (result.users as MTP.user[]).forEach((mtpUser) => {
    const user = buildApiUser(mtpUser);

    onUpdate({
      '@type': 'updateUser',
      id: user.id,
      user,
    });
  });

  const messages = (result.messages as MTP.message[])
    .map((mtpMessage) => {
      if (isMessageWithImage(mtpMessage)) {
        loadMessageMedia(mtpMessage).then((dataUri) => {
          if (!dataUri) {
            return;
          }

          onUpdate({
            '@type': 'updateMessageImage',
            message_id: mtpMessage.id,
            data_uri: dataUri,
          });
        });
      }

      return buildApiMessage(mtpMessage);
    });

  return {
    messages,
  };
}

export function sendMessage(chatId: number, text: string) {
  const localMessage = buildLocalMessage(chatId, text);
  onUpdate({
    '@type': 'updateMessage',
    id: localMessage.id,
    chat_id: chatId,
    message: localMessage,
  });

  onUpdate({
    '@type': 'updateChat',
    id: chatId,
    chat: {
      last_message: localMessage,
    },
  });

  const randomId = generateRandomBigInt();

  localDb.localMessages[randomId.toString()] = localMessage;

  void invokeRequest({
    namespace: 'messages',
    name: 'SendMessageRequest',
    args: {
      message: text,
      peer: buildInputPeer(chatId),
      randomId,
    },
  });
}

function isMessageWithImage(message: MTP.message) {
  const { media } = message;

  if (!media) {
    return false;
  }

  if (media instanceof gramJsApi.MessageMediaPhoto) {
    return true;
  }

  if (media instanceof gramJsApi.MessageMediaDocument) {
    return media.document.attributes.some((attr: any) => attr instanceof gramJsApi.DocumentAttributeSticker);
  }

  return false;
}
