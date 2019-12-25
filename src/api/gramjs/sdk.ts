import {
  provideAuthPhoneNumber, provideAuthCode, provideAuthPassword, provideAuthRegistration,
} from './connectors/auth';
import { fetchChats } from './connectors/chats';
import { fetchMessages, sendMessage } from './connectors/messages';
import { downloadMedia } from './client';

export default {
  provideAuthPhoneNumber,
  provideAuthCode,
  provideAuthPassword,
  provideAuthRegistration,
  fetchChats,
  fetchMessages,
  sendMessage,
  downloadMedia,
};
