import { ApiFileLocation } from '../../types';

<<<<<<< HEAD
import { downloadFile } from '../client';
=======
import { downloadFile, downloadMessageImage } from '../client';
import localDb from '../localDb';
import { bytesToDataUri } from '../builders/common';
>>>>>>> dda7e47e... Fix images loading; Various Gram JS fixes; Refactor Gram JS Logger

export function init() {
}

export async function loadFile(id: any, fileLocation: ApiFileLocation): Promise<string | null> {
  const fileBuffer = await downloadFile(id, fileLocation);

  return fileBuffer ? bytesToUrl(fileBuffer) : null;
}

<<<<<<< HEAD
function bytesToUrl(bytes: Uint8Array, mimeType?: string) {
  if (!mimeType) {
    mimeType = 'image/jpg';
=======
export function loadMessageMedia(message: MTP.message): Promise<string | null> {
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
