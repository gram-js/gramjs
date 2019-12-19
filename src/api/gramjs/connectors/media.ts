import { Api as GramJs, TelegramClient } from '../../../lib/gramjs';

import localDb from '../localDb';
import { getEntityTypeById } from '../inputHelpers';

// TODO Await client ready.
export default function downloadMedia(client: TelegramClient, url: string): Promise<Buffer | null> | null {
  const mediaMatch = url.match(/(avatar|msg)(-?\d+)/);
  if (!mediaMatch) {
    return null;
  }

  let entityType = mediaMatch[1];
  let entityId: number = Number(mediaMatch[2]);
  let entity: GramJs.User | GramJs.Chat | GramJs.Channel | GramJs.Message | undefined;

  if (entityType === 'avatar') {
    entityType = getEntityTypeById(entityId);
    entityId = Math.abs(entityId);
  }

  switch (entityType) {
    case 'channel':
    case 'chat':
      entity = localDb.chats[entityId];
      break;
    case 'user':
      entity = localDb.users[entityId];
      break;
    case 'msg':
      entity = localDb.messages[entityId];
      break;
  }

  if (!entity) {
    return null;
  }

  return entityType === 'msg'
    ? client.downloadMedia(entity, { sizeType: 'x' })
    : client.downloadProfilePhoto(entity, false);
}
