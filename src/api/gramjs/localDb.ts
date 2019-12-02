import { ApiMessage } from '../types';
import { MTProto } from '../../lib/gramjs';

export default <{
  chats: Record<number, MTProto.chat | MTProto.channel>;
  users: Record<number, MTProto.user>;
  localMessages: Record<string, ApiMessage>;
  // TODO Replace with persistent storage for all downloads.
  avatarRequests: Record<number, Promise<string | null>>;
  mediaRequests: Record<number, Promise<string | null>>;
}> {
  chats: {},
  users: {},
  localMessages: {},
  avatarRequests: {},
  mediaRequests: {},
};
