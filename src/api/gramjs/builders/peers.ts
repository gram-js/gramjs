import { MTProto } from '../../../lib/gramjs';

export function isPeerUser(peer: MTProto.Peer): peer is MTProto.peerUser {
  return peer.hasOwnProperty('userId');
}

export function isPeerChat(peer: MTProto.Peer): peer is MTProto.peerChat {
  return peer.hasOwnProperty('chatId');
}

export function isPeerChannel(peer: MTProto.Peer): peer is MTProto.peerChannel {
  return peer.hasOwnProperty('channelId');
}
