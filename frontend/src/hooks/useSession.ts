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

/**
 * Récupère le token déposé en fragment d'URL par le callback OIDC
 * (/#oidc-token=...), puis nettoie l'URL pour ne pas laisser traîner le token
 * dans l'historique du navigateur.
 */
function consumeOidcToken(): string | null {
  const match = window.location.hash.match(/^#oidc-token=(.+)$/);

  if (!match) {
    return null;
  }

  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  );

  return match[1] ?? null;
}

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(() =>
    readStoredSession(),
  );
  const [oidcToken] = useState(() => consumeOidcToken());
  const [isHydrating, setIsHydrating] = useState(
    Boolean(session) || Boolean(oidcToken),
  );

  useEffect(() => {
    // Le token OIDC fraîchement reçu prime sur une éventuelle session stockée.
    const token = oidcToken ?? session?.token;

    if (!token) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    api
      .me(token)
      .then(({ user }) => {
        if (cancelled) return;

        const nextSession = {
          token,
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

