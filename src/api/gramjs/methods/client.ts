import {
  TelegramClient, sessions, Api as GramJs, connection,
} from '../../../lib/gramjs';
import { Logger as GramJsLogger } from '../../../lib/gramjs/extensions/index';

import { ApiMediaFormat, ApiOnProgress } from '../../types';

import { DEBUG, DEBUG_GRAMJS, UPLOAD_WORKERS } from '../../../config';
import {
  onRequestPhoneNumber, onRequestCode, onRequestPassword, onRequestRegistration,
  onAuthError, onAuthReady, onCurrentUserUpdate, onRequestQrCode,
} from './auth';
import { setUpdaterCurrentUserId, updater, handleError } from '../updater';
import downloadMediaWithClient from './media';
import { buildApiUserFromFull } from '../apiBuilders/users';
import localDb from '../localDb';

GramJsLogger.setLevel(DEBUG_GRAMJS ? 'debug' : 'warn');

const gramJsUpdateEventBuilder = { build: (update: object) => update };

let client: TelegramClient;
let isConnected = false;

export async function init(sessionId: string) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('>>> START INIT API 2');
  }

  const session = new sessions.CacheApiSession(sessionId);
  client = new TelegramClient(
    session,
    process.env.TELEGRAM_T_API_ID,
    process.env.TELEGRAM_T_API_HASH,
    { useWSS: true } as any,
  );

  client.addEventHandler(onUpdate, gramJsUpdateEventBuilder);
  client.addEventHandler(updater, gramJsUpdateEventBuilder);

  try {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[GramJs/client] CONNECTING');
    }

    await client.start({
      phoneNumber: onRequestPhoneNumber,
      phoneCode: onRequestCode,
      password: onRequestPassword,
      firstAndLastNames: onRequestRegistration,
      qrCode: onRequestQrCode,
      onError: onAuthError,
    });

    const newSessionId = await session.save();

    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[GramJs/client] CONNECTED as ', newSessionId);
    }

    onAuthReady(newSessionId);
    void fetchCurrentUser();
  } catch (err) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[GramJs/client] CONNECTING ERROR', err);
    }

    throw err;
  }
}

export async function destroy() {
  await client.destroy();
}

function onUpdate(update: any) {
  if (update instanceof connection.UpdateConnectionState) {
    isConnected = update.state === connection.UpdateConnectionState.states.connected;
  }
}

export async function invokeRequest<T extends GramJs.AnyRequest>(
  request: T,
  shouldHandleUpdates = false,
): Promise<T['__response'] | undefined> {
  if (!isConnected) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.warn(`[GramJs/client] INVOKE ${request.className} ERROR: Client is not connected`);
    }

    return undefined;
  }

  try {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[GramJs/client] INVOKE ${request.className}`);
    }

    const result = await client.invoke(request);

    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[GramJs/client] INVOKE RESPONSE ${request.className}`, result);
    }

    if (shouldHandleUpdates) {
      if (result instanceof GramJs.Updates || result instanceof GramJs.UpdatesCombined) {
        result.updates.forEach((update) => updater(update, request));
      } else if (result instanceof GramJs.UpdatesTooLong) {
        // TODO Implement
      } else {
        updater(result as GramJs.TypeUpdates, request);
      }
    }

    return result;
  } catch (err) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(`[GramJs/client] INVOKE ERROR ${request.className}`);
      // eslint-disable-next-line no-console
      console.error(err);
    }

    const isSlowMode = err.message.startsWith('A wait of') && (
      request instanceof GramJs.messages.SendMessage
      || request instanceof GramJs.messages.SendMedia
      || request instanceof GramJs.messages.SendMultiMedia
    );

    handleError({
      ...err,
      isSlowMode,
    });
    return undefined;
  }
}

export function downloadMedia(
  args: { url: string; mediaFormat: ApiMediaFormat; start?: number; end?: number },
  onProgress?: ApiOnProgress,
) {
  return downloadMediaWithClient(args, client, isConnected, onProgress);
}

export function uploadFile(file: File, onProgress?: ApiOnProgress) {
  return client.uploadFile({ file, onProgress, workers: UPLOAD_WORKERS });
}

export async function fetchCurrentUser() {
  const userFull = await invokeRequest(new GramJs.users.GetFullUser({
    id: new GramJs.InputUserSelf(),
  }));

  if (!userFull || !(userFull.user instanceof GramJs.User)) {
    return;
  }

  localDb.users[userFull.user.id] = userFull.user;
  const currentUser = buildApiUserFromFull(userFull);

  setUpdaterCurrentUserId(currentUser.id);
  onCurrentUserUpdate(currentUser);
}
