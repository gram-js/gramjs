import { BigInteger } from 'big-integer';
import { gramJsApi, MTProto } from '../../lib/gramjs';

import { generateRandomBytes, readBigIntFromBuffer } from '../../lib/gramjs/Helpers';
import localDb from './localDb';

const ctors = gramJsApi.constructors;

export function buildInputPeer(chatOrUserId: number): MTProto.Peer {
  if (chatOrUserId > 0) {
    const user = localDb.users[chatOrUserId] as MTProto.user;

    return user && new ctors.InputPeerUser({
      userId: chatOrUserId,
      accessHash: user.accessHash as BigInteger,
    });
  } else if (chatOrUserId <= -1000000000) {
    const channel = localDb.chats[-chatOrUserId] as MTProto.channel;

    return channel && new ctors.InputPeerChannel({
      channelId: -chatOrUserId,
      accessHash: channel.accessHash as BigInteger,
    });
  } else {
    return new ctors.InputPeerChat({
      chatId: -chatOrUserId,
    });
  }
}

export function buildInputPeerPhotoFileLocation(
  chatOrUserId: number,
  volumeId: MTProto.long,
  localId: number,
): MTProto.inputPeerPhotoFileLocation {
  const peer = buildInputPeer(chatOrUserId);
  return new ctors.InputPeerPhotoFileLocation({
    peer,
    volumeId,
    localId,
  });
}

export function generateRandomBigInt() {
  return readBigIntFromBuffer(generateRandomBytes(8), false);
}
