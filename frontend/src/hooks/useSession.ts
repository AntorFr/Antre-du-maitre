import type { AuthUser, LoginRequest } from '@antre-du-maitre/shared';
import { useEffect, useState } from 'react';

import { api } from '../lib/api';
import {
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
} from '../lib/session';

type SessionState = {
  token: string;
  user: AuthUser;
};

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(() =>
    readStoredSession(),
  );
  const [isHydrating, setIsHydrating] = useState(Boolean(session));

  useEffect(() => {
    if (!session) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    api
      .me(session.token)
      .then(({ user }) => {
        if (cancelled) return;

        const nextSession = {
          token: session.token,
          user,
        };

        setSession(nextSession);
        writeStoredSession(nextSession);
      })
      .catch(() => {
        if (cancelled) return;

        clearStoredSession();
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsHydrating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(input: LoginRequest) {
    const nextSession = await api.login(input);
    setSession(nextSession);
    writeStoredSession(nextSession);
  }

  function logout() {
    clearStoredSession();
    setSession(null);
  }

  return {
    session,
    isHydrating,
    login,
    logout,
  };
}

