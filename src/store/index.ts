import {
  addCallback, addReducer, removeCallback, setGlobal,
} from '../lib/teactn';

import { GlobalState } from './types';

import { pause, throttle } from '../util/schedulers';
import { GLOBAL_STATE_CACHE_DISABLED, GLOBAL_STATE_CACHE_KEY, GRAMJS_SESSION_ID_KEY } from '../config';
import { getChatAvatarHash } from '../modules/helpers';
import * as mediaLoader from '../util/mediaLoader';

const INITIAL_STATE: GlobalState = {
  showRightColumn: true,

  users: {
    byId: {},
  },

  chats: {
    ids: null,
    byId: {},
    scrollOffsetById: {},
    replyingToById: {},
  },

  groups: {
    ids: [],
    byId: {},
  },

  messages: {
    byChatId: {},
  },

  authRememberMe: true,
};
const CACHE_THROTTLE_TIMEOUT = 1000;
const MAX_PRELOAD_DELAY = 1000;

const updateCacheThrottled = throttle(updateCache, CACHE_THROTTLE_TIMEOUT, false);

addReducer('init', () => {
  setGlobal(INITIAL_STATE);

  const hasActiveSession = localStorage.getItem(GRAMJS_SESSION_ID_KEY);
  if (!GLOBAL_STATE_CACHE_DISABLED && hasActiveSession) {
    const cached = getCache();

    if (cached) {
      preloadAssets(cached)
        .then(() => {
          setGlobal(cached);
        });
    }

    addCallback(updateCacheThrottled);
  }
});

if (!GLOBAL_STATE_CACHE_DISABLED) {
  addReducer('saveSession', () => {
    addCallback(updateCacheThrottled);
  });

  addReducer('signOut', () => {
    removeCallback(updateCacheThrottled);
    localStorage.removeItem(GLOBAL_STATE_CACHE_KEY);
  });
}

function preloadAssets(cached: GlobalState) {
  return Promise.race([
    pause(MAX_PRELOAD_DELAY),
    Promise.all(
      Object.values(cached.chats.byId).map((chat) => {
        const avatarHash = getChatAvatarHash(chat);
        return avatarHash ? mediaLoader.fetch(avatarHash, mediaLoader.Type.DataUri) : null;
      }),
    ),
  ]);
}

function updateCache(global: GlobalState) {
  if (global.isLoggingOut) {
    return;
  }

  const reducedState: GlobalState = {
    ...global,
    chats: reduceChatsForCache(global),
    messages: reduceMessagesForCache(global),
    connectionState: undefined,
    // TODO Reduce `users` and `groups`?
  };

  const json = JSON.stringify(reducedState);
  localStorage.setItem(GLOBAL_STATE_CACHE_KEY, json);
}

function reduceChatsForCache(global: GlobalState) {
  const byId: GlobalState['chats']['byId'] = {};
  const scrollOffsetById: GlobalState['chats']['scrollOffsetById'] = {};
  const replyingToById: GlobalState['chats']['replyingToById'] = {};

  if (global.chats.ids) {
    global.chats.ids.forEach((id) => {
      byId[id] = global.chats.byId[id];
      scrollOffsetById[id] = global.chats.scrollOffsetById[id];
      replyingToById[id] = global.chats.replyingToById[id];
    });
  }

  return {
    ...global.chats,
    byId,
    scrollOffsetById,
    replyingToById,
  };
}

function reduceMessagesForCache(global: GlobalState) {
  const byChatId: GlobalState['messages']['byChatId'] = {};

  if (global.chats.ids) {
    global.chats.ids.forEach((chatId) => {
      byChatId[chatId] = global.messages.byChatId[chatId];
    });
  }

  return {
    ...global.messages,
    byChatId,
  };
}

function getCache(): GlobalState | null {
  const json = localStorage.getItem(GLOBAL_STATE_CACHE_KEY);
  return json ? JSON.parse(json) : null;
}
