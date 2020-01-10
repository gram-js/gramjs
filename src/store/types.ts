import {
  ApiChat,
  ApiMessage,
  ApiUser,
  ApiGroup,
  ApiUpdateAuthorizationStateType,
  ApiUpdateConnectionStateType,
} from '../api/types';

export type GlobalState = {
  showRightColumn: boolean;

  users: {
    byId: Record<number, ApiUser>;
    selectedId?: number;
  };

  chats: {
    selectedId?: number;
    ids: number[] | null;
    byId: Record<number, ApiChat>;
    scrollOffsetById: Record<number, number>;
    replyingToById: Record<number, number>;
  };

  groups: {
    ids: number[];
    byId: Record<number, ApiGroup>;
  };

  messages: {
    selectedMediaMessageId?: number;
    byChatId: Record<number, {
      byId: Record<number, ApiMessage>;
    }>;
  };

  // TODO Move to `auth`.
  isLoggingOut?: boolean;
  authState?: ApiUpdateAuthorizationStateType;
  authPhoneNumber?: string;
  authIsLoading?: boolean;
  authError?: string;
  authRememberMe?: boolean;
  authIsSessionRemembered?: boolean;

  connectionState?: ApiUpdateConnectionStateType;
};

export type ActionTypes = (
  // system
  'init' | 'setAuthPhoneNumber' | 'setAuthCode' | 'setAuthPassword' | 'signUp' | 'returnToAuthPhoneNumber' | 'signOut' |
  'setAuthRememberMe' | 'toggleRightColumn' | 'saveSession' | 'sync' |
  // chats
  'loadChats' | 'loadMoreChats' | 'openChat' | 'openChatWithInfo' | 'setChatScrollOffset' | 'setChatReplyingTo' |
  'loadFullChat' | 'loadChatOnlines' |
  // messages
  'loadChatMessages' | 'loadMoreChatMessages' | 'selectMessage' | 'sendTextMessage' | 'pinMessage' | 'deleteMessages' |
  'selectMediaMessage' |
  // users
  'loadFullUser' | 'openUserInfo'
);

export type GlobalActions = Record<ActionTypes, Function>;
