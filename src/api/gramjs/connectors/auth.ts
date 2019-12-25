import { ApiUpdateAuthorizationState, ApiUpdateAuthorizationStateType } from '../../types';
import { OnApiUpdate } from '../types';

const authPromiseResolvers: {
  resolvePhoneNumber: null | Function;
  resolveCode: null | Function;
  resolvePassword: null | Function;
  resolveRegistration: null | Function;
} = {
  resolvePhoneNumber: null,
  resolveCode: null,
  resolvePassword: null,
  resolveRegistration: null,
};

let onUpdate: OnApiUpdate;

export function init(_onUpdate: OnApiUpdate) {
  onUpdate = _onUpdate;
}

export function onRequestPhoneNumber() {
  if (!onUpdate) {
    return null;
  }

  onUpdate(buildAuthState('authorizationStateWaitPhoneNumber'));

  return new Promise((resolve) => {
    authPromiseResolvers.resolvePhoneNumber = resolve;
  });
}

export function onRequestCode() {
  if (!onUpdate) {
    return null;
  }

  onUpdate(buildAuthState('authorizationStateWaitCode'));

  return new Promise((resolve) => {
    authPromiseResolvers.resolveCode = resolve;
  });
}

export function onRequestPassword() {
  if (!onUpdate) {
    return null;
  }

  onUpdate(buildAuthState('authorizationStateWaitPassword'));

  return new Promise((resolve) => {
    authPromiseResolvers.resolvePassword = resolve;
  });
}

export function onRequestRegistration() {
  if (!onUpdate) {
    return null;
  }

  onUpdate(buildAuthState('authorizationStateWaitRegistration'));

  return new Promise((resolve) => {
    authPromiseResolvers.resolveRegistration = resolve;
  });
}

export function onAuthReady(sessionId: string) {
  if (!onUpdate) {
    return;
  }

  onUpdate({
    ...buildAuthState('authorizationStateReady'),
    session_id: sessionId,
  });
}

export function buildAuthState(authState: ApiUpdateAuthorizationStateType): ApiUpdateAuthorizationState {
  return {
    '@type': 'updateAuthorizationState',
    authorization_state: {
      '@type': authState,
    },
  };
}

export function provideAuthPhoneNumber(phoneNumber: string) {
  if (!authPromiseResolvers.resolvePhoneNumber) {
    return;
  }

  authPromiseResolvers.resolvePhoneNumber(phoneNumber);
}

export function provideAuthCode(code: string) {
  if (!authPromiseResolvers.resolveCode) {
    return;
  }

  authPromiseResolvers.resolveCode(code);
}

export function provideAuthPassword(password: string) {
  if (!authPromiseResolvers.resolvePassword) {
    return;
  }

  authPromiseResolvers.resolvePassword(password);
}

export function provideAuthRegistration(registration: { firstName: string; lastName: string }) {
  const { firstName, lastName } = registration;

  if (!authPromiseResolvers.resolveRegistration) {
    return;
  }

  authPromiseResolvers.resolveRegistration([firstName, lastName]);
}
