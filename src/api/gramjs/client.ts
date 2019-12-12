<<<<<<< HEAD
import {
  TelegramClient, session, GramJsApi, MTProto,
} from '../../lib/gramjs';
=======
import { TelegramClient, sessions, Api as GramJs } from '../../lib/gramjs';
>>>>>>> 42589b8b... GramJS: Add `LocalStorageSession` with keys and hashes for all DCs
import { Logger as GramJsLogger } from '../../lib/gramjs/extensions';

import { DEBUG } from '../../config';
import {
  onAuthReady, onRequestCode, onRequestPassword, onRequestPhoneNumber,
} from './connectors/auth';
import { onGramJsUpdate } from './onGramJsUpdate';
<<<<<<< HEAD
import localDb from './localDb';
import { buildInputPeerPhotoFileLocation } from './inputHelpers';
import { ApiFileLocation } from '../types';
<<<<<<< HEAD
=======
=======
>>>>>>> f70d85dd... Gram JS: Replace generated `tl/*` contents with runtime logic; TypeScript typings

GramJsLogger.getLogger().level = 'debug';
>>>>>>> dda7e47e... Fix images loading; Various Gram JS fixes; Refactor Gram JS Logger

let client: TelegramClient;

export async function init(sessionId: string) {
  const session = new sessions.LocalStorageSession(sessionId);
  client = new TelegramClient(
    session,
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

    const newSessionId = session.save();

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

export async function invokeRequest<T extends InstanceType<GramJsApi.AnyRequest>>(request: T) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(`[GramJs/client] INVOKE ${request.className}`);
  }

  const result = await client.invoke(request);

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log(`[GramJs/client] INVOKE RESPONSE ${request.className}`, result);
  }

  return result;
}

<<<<<<< HEAD
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
=======
export function downloadAvatar(entity: MTProto.chat | MTProto.user, isBig = false) {
  return client.downloadProfilePhoto(entity, isBig);
}

export function downloadMessageImage(message: MTProto.message) {
  return client.downloadMedia(message, { sizeType: 'x' });
}
>>>>>>> f70d85dd... Gram JS: Replace generated `tl/*` contents with runtime logic; TypeScript typings
