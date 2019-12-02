import { MTProto } from '../../../lib/gramjs';
import { ApiFileLocation } from '../../types';

export function buildApiPhotoLocations(entity: MTProto.user | MTProto.chat): {
  small: ApiFileLocation;
  big: ApiFileLocation;
} | undefined {
  if (!entity.photo) {
    return undefined;
  }

  const { photoSmall, photoBig, dcId } = entity.photo as (MTProto.userProfilePhoto | MTProto.chatPhoto);

  return {
    small: {
      ...photoSmall,
      dcId,
    },
    big: {
      ...photoBig,
      dcId,
    },
  };
}

export function bytesToDataUri(bytes: Uint8Array, shouldOmitPrefix = false, mimeType: string = 'image/jpg') {
  const prefix = shouldOmitPrefix ? '' : `data:${mimeType};base64,`;

  return `${prefix}${btoa(
    bytes.reduce((data, byte) => {
      return data + String.fromCharCode(byte);
    }, ''),
  )}`;
}
