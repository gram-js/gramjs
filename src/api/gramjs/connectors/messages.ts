import { gramJsApi, MTProto } from '../../../lib/gramjs';

import { ApiMessage } from '../../types';
import { OnApiUpdate } from '../types';

import { invokeRequest } from '../client';
import { buildApiMessage, buildLocalMessage } from '../builders/messages';
import { buildApiUser } from '../builders/users';
import { buildInputPeer, generateRandomBigInt } from '../inputHelpers';
import localDb from '../localDb';
import { loadMessageMedia } from './files';
import { UNSUPPORTED_RESPONSE } from '../utils';
import { onGramJsUpdate } from '../onGramJsUpdate';

const { constructors: ctors, requests } = gramJsApi;

let onUpdate: OnApiUpdate;

export function init(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

export async function fetchMessages({ chatId, fromMessageId, limit }: {
  chatId: number;
  fromMessageId: number;
  limit: number;
}): Promise<{ messages: ApiMessage[] } | null> {
  const result = await invokeRequest(new requests.messages.GetHistoryRequest({
    offsetId: fromMessageId,
    limit,
    peer: buildInputPeer(chatId),
  }));

  if (
    !result
    || !(result instanceof ctors.messages.MessagesSlice || result instanceof ctors.messages.ChannelMessages)
    || !result.messages
  ) {
    throw new Error(UNSUPPORTED_RESPONSE);
  }

  (result.users as MTProto.user[]).forEach((mtpUser) => {
    const user = buildApiUser(mtpUser);

    onUpdate({
      '@type': 'updateUser',
      id: user.id,
      user,
    });
  });

  const messages = (result.messages as MTProto.message[])
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
  const request = new requests.messages.SendMessageRequest({
    message: text,
    peer: buildInputPeer(chatId),
    randomId,
  });
  const result = invokeRequest(request);

  if (result instanceof ctors.UpdatesTooLong) {
    throw new Error(UNSUPPORTED_RESPONSE);
  }

  if (result instanceof ctors.Updates) {
    result.updates.forEach((update) => onGramJsUpdate(update, request));
  } else {
    onGramJsUpdate(result, request);
  }
}

<<<<<<< HEAD
function isMessageWithImage(message: MTP.message) {
=======
function loadImage(mtpMessage: MTProto.message) {
  if (!isMessageWithImage(mtpMessage)) {
    return;
  }

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

function isMessageWithImage(message: MTProto.message) {
>>>>>>> f70d85dd... Gram JS: Replace generated `tl/*` contents with runtime logic; TypeScript typings
  const { media } = message;

  if (!media) {
    return false;
  }

  if (media instanceof ctors.MessageMediaPhoto) {
    return true;
  }

  if (media instanceof ctors.MessageMediaDocument && media.document) {
    return ('attributes' in media.document) && media.document.attributes
      .some((attr: any) => attr instanceof ctors.DocumentAttributeSticker);
  }

  return false;
}
