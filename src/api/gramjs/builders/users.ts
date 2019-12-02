import { gramJsApi, MTProto } from '../../../lib/gramjs';
import { ApiUser, ApiUserStatus } from '../../types';
import { buildApiPhotoLocations } from './common';

const ctors = gramJsApi.constructors;

export function buildApiUser(mtpUser: MTProto.user): ApiUser {
  return {
    id: mtpUser.id,
    type: {
      // TODO Support other user types.
      '@type': 'userTypeRegular',
    },
    first_name: mtpUser.firstName,
    last_name: mtpUser.lastName,
    username: mtpUser.username || '',
    phone_number: mtpUser.phone || '',
    profile_photo_locations: buildApiPhotoLocations(mtpUser),
    status: buildApiUserStatus(mtpUser.status),
  };
}

export function buildApiUserStatus(mtpStatus?: MTProto.UserStatus): ApiUserStatus | undefined {
  if (!mtpStatus || mtpStatus instanceof ctors.UserStatusEmpty) {
    return { '@type': 'userStatusEmpty' };
  } else if (mtpStatus instanceof ctors.UserStatusOnline) {
    return { '@type': 'userStatusOnline' };
  } else if (mtpStatus instanceof ctors.UserStatusOffline) {
    return { '@type': 'userStatusOffline', was_online: mtpStatus.wasOnline };
  } else if (mtpStatus instanceof ctors.UserStatusRecently) {
    return { '@type': 'userStatusRecently' };
  } else if (mtpStatus instanceof ctors.UserStatusLastWeek) {
    return { '@type': 'userStatusLastWeek' };
  } else if (mtpStatus instanceof ctors.UserStatusLastMonth) {
    return { '@type': 'userStatusLastMonth' };
  }

  return undefined;
}
