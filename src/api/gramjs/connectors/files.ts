import { ApiFileLocation } from '../../types';

import { downloadFile } from '../client';

export function init() {
}

export async function loadFile(id: any, fileLocation: ApiFileLocation): Promise<string | null> {
  const fileBuffer = await downloadFile(id, fileLocation);

  return fileBuffer ? bytesToUrl(fileBuffer) : null;
}

function bytesToUrl(bytes: Uint8Array, mimeType?: string) {
  if (!mimeType) {
    mimeType = 'image/jpg';
  }

  return `data:${mimeType};base64,${btoa(
    bytes.reduce((data, byte) => {
      return data + String.fromCharCode(byte);
    }, ''),
  )}`;
}
