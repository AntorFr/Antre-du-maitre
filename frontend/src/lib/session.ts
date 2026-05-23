import type { AuthUser } from '@antre-du-maitre/shared';

const TOKEN_KEY = 'antre-du-maitre.token';
const USER_KEY = 'antre-du-maitre.user';

export type StoredSession = {
  token: string;
  user: AuthUser;
};

export function readStoredSession(): StoredSession | null {
  const token = window.localStorage.getItem(TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);

  if (!token || !rawUser) {
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(rawUser) as AuthUser,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function writeStoredSession(session: StoredSession) {
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

