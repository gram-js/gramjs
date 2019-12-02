<<<<<<< HEAD
import { ApiFileLocation } from '../../types';

<<<<<<< HEAD
import { downloadFile } from '../client';
=======
import { downloadFile, downloadMessageImage } from '../client';
=======
import { MTProto } from '../../../lib/gramjs';
import { downloadAvatar, downloadMessageImage } from '../client';
>>>>>>> f70d85dd... Gram JS: Replace generated `tl/*` contents with runtime logic; TypeScript typings
import localDb from '../localDb';
import { bytesToDataUri } from '../builders/common';
>>>>>>> dda7e47e... Fix images loading; Various Gram JS fixes; Refactor Gram JS Logger

export function init() {
}

<<<<<<< HEAD
export async function loadFile(id: any, fileLocation: ApiFileLocation): Promise<string | null> {
  const fileBuffer = await downloadFile(id, fileLocation);
=======
export function loadAvatar(entity: MTProto.user | MTProto.chat): Promise<string | null> {
  const entityId = entity.id;

  if (!localDb.avatarRequests[entityId]) {
    localDb.avatarRequests[entityId] = downloadAvatar(entity)
      .then(
        (fileBuffer: Buffer) => {
          if (fileBuffer) {
            return bytesToDataUri(fileBuffer);
          } else {
            delete localDb.avatarRequests[entityId];
            return null;
          }
        },
        () => {
          delete localDb.avatarRequests[entityId];
          return null;
        },
      );
  }
>>>>>>> f70d85dd... Gram JS: Replace generated `tl/*` contents with runtime logic; TypeScript typings

  return fileBuffer ? bytesToUrl(fileBuffer) : null;
}

<<<<<<< HEAD
<<<<<<< HEAD
function bytesToUrl(bytes: Uint8Array, mimeType?: string) {
  if (!mimeType) {
    mimeType = 'image/jpg';
=======
export function loadMessageMedia(message: MTP.message): Promise<string | null> {
=======
export function loadMessageMedia(message: MTProto.message): Promise<string | null> {
>>>>>>> f70d85dd... Gram JS: Replace generated `tl/*` contents with runtime logic; TypeScript typings
  const messageId = message.id;

  if (!localDb.mediaRequests[messageId]) {
    localDb.mediaRequests[messageId] = downloadMessageImage(message)
      .then(
        (fileBuffer: Buffer) => {
          if (fileBuffer) {
            return bytesToDataUri(fileBuffer);
          } else {
            delete localDb.mediaRequests[messageId];
            return null;
          }
        },
        () => {
          delete localDb.mediaRequests[messageId];
          return null;
        },
      );
>>>>>>> dda7e47e... Fix images loading; Various Gram JS fixes; Refactor Gram JS Logger
  }

  return `data:${mimeType};base64,${btoa(
    bytes.reduce((data, byte) => {
      return data + String.fromCharCode(byte);
    }, ''),
  )}`;
}
