import * as gramJsApi from '../../lib/gramjs/tl/types';
import {
  InvokeRequestPayload,
  SupportedMessageRequests,
  SupportedUploadRequests,
} from './types/types';
import * as apiRequests from '../../lib/gramjs/tl/functions';
import { Logger as GramJsLogger } from '../../lib/gramjs/extensions';

import { TelegramClient, session } from '../../lib/gramjs';
import { DEBUG } from '../../config';
import {
  onAuthReady, onRequestCode, onRequestPassword, onRequestPhoneNumber,
} from './connectors/auth';
import { onGramJsUpdate } from './onGramJsUpdate';
import localDb from './localDb';
import { buildInputPeerPhotoFileLocation } from './inputHelpers';
import { ApiFileLocation } from '../types';
<<<<<<< HEAD
=======

GramJsLogger.getLogger().level = 'debug';
>>>>>>> dda7e47e... Fix images loading; Various Gram JS fixes; Refactor Gram JS Logger

let client: any;

export async function init(sessionId: string) {
  const { StringSession } = session;

  const stringSession = new StringSession(sessionId);
  client = new TelegramClient(
    stringSession,
    process.env.TELEGRAM_T_API_ID,
    process.env.TELEGRAM_T_API_HASH,
    { useWSS: true } as any,
  );

  client.addEventHandler(onGramJsUpdate, { build: (update: object) => update });

  try {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[GramJs/worker] CONNECTING');
    }

    await client.start({
      phone: onRequestPhoneNumber,
      code: onRequestCode,
      password: onRequestPassword,
    } as any);

    const newSessionId = stringSession.save();

    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[GramJs/worker] CONNECTED as ', newSessionId);
    }

    onAuthReady(newSessionId);
  } catch (err) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[GramJs/worker] CONNECTING ERROR', err);
    }

    throw err;
  }
}

export async function invokeRequest(data: InvokeRequestPayload) {
  const { namespace, name, args } = data;

  let RequestClass;

  // For some reason these types are not working automatically.
  switch (namespace) {
    case 'messages':
      RequestClass = apiRequests.messages[name as SupportedMessageRequests];
      break;
    case 'upload':
      RequestClass = apiRequests.upload[name as SupportedUploadRequests];
      break;
    default:
      return null;
  }

  const request = new RequestClass(args);

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(`[GramJs/worker] INVOKE ${name}`, args);
  }

  const result = await client.invoke(request);

  postProcess(name, result, args);

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(`[GramJs/worker] INVOKE RESPONSE ${name}`, result);
  }

  return result;
}

<<<<<<< HEAD
export function downloadFile(id: number, fileLocation: ApiFileLocation, dcId?: number) {
  return client.downloadFile(
    buildInputPeerPhotoFileLocation({ id, fileLocation }),
    true,
=======
export function downloadFile(chatOrUserId: number, fileLocation: ApiFileLocation) {
  const { dcId, volumeId, localId } = fileLocation;

  return client.downloadFile(
    buildInputPeerPhotoFileLocation(chatOrUserId, volumeId, localId),
>>>>>>> dda7e47e... Fix images loading; Various Gram JS fixes; Refactor Gram JS Logger
    { dcId },
  );
}

<<<<<<< HEAD
=======
export function downloadMessageImage(message: MTP.message) {
  return client.downloadMedia(message, { sizeType: 'x' });
}

>>>>>>> dda7e47e... Fix images loading; Various Gram JS fixes; Refactor Gram JS Logger
function postProcess(name: string, anyResult: any, args: AnyLiteral) {
  switch (name) {
    case 'GetDialogsRequest': {
      const result: MTP.messages$Dialogs = anyResult;

      if (!result || !result.dialogs) {
        return;
      }

      result.users.forEach((user) => {
        localDb.users[user.id] = user as MTP.user;
      });

      result.chats.forEach((chat) => {
        localDb.chats[chat.id] = chat as MTP.chat | MTP.channel;
      });

      break;
    }

    case 'SendMessageRequest': {
      const result = anyResult;

      if (!result) {
        return;
      }

      // TODO Support this.
      if (result instanceof gramJsApi.UpdatesTooLong) {
        return;
      }

      const updates = result.hasOwnProperty('updates') ? result.updates as MTP.Updates[] : [result as MTP.Updates];

      const originRequest = {
        name,
        args,
      };
      updates.forEach((update) => onGramJsUpdate(update, originRequest));
    }
  }
}
