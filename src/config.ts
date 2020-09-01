export const DEBUG = true;

export const MEDIA_CACHE_DISABLED = true;
export const MEDIA_CACHE_NAME = 'tt-media';

export const GLOBAL_STATE_CACHE_DISABLED = false;
export const GLOBAL_STATE_CACHE_KEY = 'tt-global-state';
<<<<<<< HEAD
=======
export const GLOBAL_STATE_CACHE_CHAT_LIST_LIMIT = 20;

export const MEDIA_CACHE_DISABLED = false;
export const MEDIA_CACHE_NAME = 'tt-media';
export const MEDIA_PROGRESSIVE_CACHE_DISABLED = false;
export const MEDIA_PROGRESSIVE_CACHE_NAME = 'tt-media-progressive';
export const MEDIA_CACHE_MAX_BYTES = 512000; // 512 KB
export const CUSTOM_BG_CACHE_NAME = 'tt-custom-bg';

export const DOWNLOAD_WORKERS = 16;
export const UPLOAD_WORKERS = 16;

const isBigScreen = typeof window !== 'undefined' && window.innerHeight >= 900;

export const MESSAGE_LIST_SENSITIVE_AREA = 750;
export const MESSAGE_LIST_SLICE = isBigScreen ? 50 : 40;
export const MESSAGE_LIST_VIEWPORT_LIMIT = MESSAGE_LIST_SLICE * 3;

export const CHAT_LIST_SLICE = 20;
export const CHAT_LIST_LOAD_SLICE = 100;
export const SHARED_MEDIA_SLICE = 30;
export const MESSAGE_SEARCH_SLICE = 30;
export const GLOBAL_SEARCH_SLICE = 20;

export const TOP_CHATS_PRELOAD_LIMIT = 15;

export const DEFAULT_ANIMATION_LEVEL = 2;
export const DEFAULT_MESSAGE_TEXT_SIZE_PX = 16;
>>>>>>> edef29da... [Perf] GramJs: Add parallel uploads (#659)

export const GRAMJS_SESSION_ID_KEY = 'GramJs:sessionId';
export const TDLIB_SESSION_ID_KEY = 'TdLib:sessionId';
