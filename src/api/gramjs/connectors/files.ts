import { ApiFileLocation } from '../../types';

import { downloadFile } from '../client';

export function init() {
}

export async function loadFile(id: any, fileLocation: ApiFileLocation): Promise<string | null> {
  const result = await downloadFile(id, fileLocation);
  // eslint-disable-next-line no-underscore-dangle
  return result ? bytesToUrl(result) : null;
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
