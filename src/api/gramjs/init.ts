import { OnApiUpdate } from './types';

import { init as initUpdater } from './onGramJsUpdate';
import { init as initAuth } from './connectors/auth';
import { init as initChats } from './connectors/chats';
import { init as initMessages } from './connectors/messages';
import { init as initFiles } from './connectors/files';
import { init as initClient } from './client';

export async function init(onUpdate: OnApiUpdate, sessionId = '') {
  initUpdater(onUpdate);
  initAuth(onUpdate);
  initChats(onUpdate);
  initMessages(onUpdate);
  initFiles();

  await initClient(sessionId);
}
