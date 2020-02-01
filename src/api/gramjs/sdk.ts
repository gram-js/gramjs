import {
  provideAuthPhoneNumber, provideAuthCode, provideAuthPassword, provideAuthRegistration,
} from './connectors/auth';
<<<<<<< HEAD
import { fetchChats } from './connectors/chats';
import { fetchMessages, sendMessage } from './connectors/messages';
import { downloadMedia } from './client';
=======
import { fetchChats, fetchFullChat, fetchChatOnlines } from './connectors/chats';
import {
  fetchMessages, sendMessage, pinMessage, deleteMessages, markMessagesRead,
} from './connectors/messages';
import { fetchFullUser, fetchNearestCountry } from './connectors/users';
import { destroy, downloadMedia } from './client';
>>>>>>> 5143ac4c... Fixes for Log Out

export default {
  provideAuthPhoneNumber,
  provideAuthCode,
  provideAuthPassword,
  provideAuthRegistration,
  fetchChats,
  fetchMessages,
  sendMessage,
<<<<<<< HEAD
=======
  pinMessage,
  deleteMessages,
  markMessagesRead,
  destroy,
>>>>>>> 5143ac4c... Fixes for Log Out
  downloadMedia,
};
