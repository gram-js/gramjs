import { getDispatch, getGlobal, setGlobal } from '../../../lib/teactn';

import {
  ApiUpdate,
  ApiUpdateAuthorizationState,
  ApiUpdateConnectionState,
} from '../../../api/types';

export function onUpdate(update: ApiUpdate) {
  switch (update['@type']) {
    case 'updateAuthorizationState':
      onUpdateAuthorizationState(update);
      break;

    case 'updateConnectionState':
      onUpdateConnectionState(update);
      break;
  }
}

function onUpdateAuthorizationState(update: ApiUpdateAuthorizationState) {
  const currentState = getGlobal().authState;
  const authState = update.authorization_state['@type'];
  let authError;

  if (currentState === 'authorizationStateWaitCode' && authState === 'authorizationStateWaitCode') {
    authError = 'Invalid Code';
  } else if (currentState === 'authorizationStateWaitPassword' && authState === 'authorizationStateWaitPassword') {
    authError = 'Invalid Password';
  }

  setGlobal({
    ...getGlobal(),
    authState,
    authIsLoading: false,
    authError,
  });

  switch (authState) {
    case 'authorizationStateLoggingOut':
      setGlobal({
        ...getGlobal(),
        isLoggingOut: true,
      });
      break;
    case 'authorizationStateWaitPhoneNumber':
      break;
    case 'authorizationStateWaitCode':
      break;
    case 'authorizationStateWaitPassword':
      break;
    case 'authorizationStateWaitRegistration':
      break;
    case 'authorizationStateReady': {
      const { session_id } = update;
      if (session_id && getGlobal().authRememberMe) {
        getDispatch().saveSession({ sessionId: session_id });
      }

      getDispatch().sync();

      setGlobal({
        ...getGlobal(),
        isLoggingOut: false,
      });

      break;
    }
    default:
      break;
  }
}

function onUpdateConnectionState(update: ApiUpdateConnectionState) {
  const connectionState = update.connection_state['@type'];

  setGlobal({
    ...getGlobal(),
    connectionState,
  });

  switch (connectionState) {
    case 'connectionStateReady': {
      getDispatch().sync();

      break;
    }
    default:
      break;
  }
}
