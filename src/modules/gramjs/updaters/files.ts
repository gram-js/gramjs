import { getGlobal, setGlobal } from '../../../lib/teactn';

import { ApiUpdate } from '../../../api/types';

export function onUpdate(update: ApiUpdate) {
  switch (update['@type']) {
    case 'updateMessageImage': {
      const { message_id, data_uri } = update;

      const fileKey = `msg${message_id}`;
      updateFile(fileKey, data_uri);

      break;
    }
  }
}

function updateFile(fileId: string, dataUri: string) {
  const global = getGlobal();

  setGlobal({
    ...global,
    files: {
      ...global.files,
      byKey: {
        ...global.files.byKey,
        [fileId]: {
          ...(global.files.byKey[fileId] || {}),
          dataUri,
        },
      },
    },
  });
}
