import { ApiChat } from './chats';
import { ApiMessage } from './messages';
import { ApiUser } from './users';

export type ApiUpdateAuthorizationStateType = (
  'authorizationStateLoggingOut' |
  'authorizationStateWaitTdlibParameters' |
  'authorizationStateWaitEncryptionKey' |
  'authorizationStateWaitPhoneNumber' |
  'authorizationStateWaitCode' |
  'authorizationStateWaitPassword' |
  'authorizationStateWaitRegistration' |
  'authorizationStateReady' |
  'authorizationStateClosing' |
  'authorizationStateClosed'
);

export type ApiUpdateAuthorizationState = {
  '@type': 'updateAuthorizationState';
  authorization_state: {
    '@type': ApiUpdateAuthorizationStateType;
  };
  session_id?: string;
};

export type ApiUpdateChats = {
  '@type': 'chats';
  chats: ApiChat[];
};

export type ApiUpdateChat = {
  '@type': 'updateChat';
  id: number;
  chat: Partial<ApiChat>;
};

export type ApiUpdateMessage = {
  '@type': 'updateMessage';
  chat_id: number;
  id: number;
  message: Partial<ApiMessage>;
};

export type ApiUpdateMessageSendSucceeded = {
  '@type': 'updateMessageSendSucceeded';
  chat_id: number;
  old_message_id: number;
  message: ApiMessage;
};

export type ApiUpdateMessageSendFailed = {
  '@type': 'updateMessageSendFailed';
  chat_id: number;
  old_message_id: number;
  sending_state: {
    '@type': 'messageSendingStateFailed';
  };
};

export type ApiUpdateUsers = {
  '@type': 'users';
  users: ApiUser[];
};

export type ApiUpdateUser = {
  '@type': 'updateUser';
  id: number;
  user: Partial<ApiUser>;
};

export type ApiUpdateMessageImage = {
  '@type': 'updateMessageImage';
  message_id: number;
  data_uri: string;
};

export type ApiUpdate = (
  ApiUpdateAuthorizationState |
  ApiUpdateChats | ApiUpdateChat |
  ApiUpdateMessage | ApiUpdateMessageSendSucceeded | ApiUpdateMessageSendFailed |
  ApiUpdateUsers | ApiUpdateUser |
  ApiUpdateMessageImage
);
