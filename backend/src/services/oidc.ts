import * as oidc from 'openid-client';
import { Role } from '@prisma/client';

import { env } from '../config/env.js';

export type OidcSettings = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * Renvoie la config OIDC si elle est complète, sinon null (login local seul).
 * Les quatre variables vont ensemble : en poser une partie est une erreur de
 * déploiement, pas un mode dégradé.
 */
export function getOidcSettings(): OidcSettings | null {
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI } =
    env;

  if (
    !OIDC_ISSUER ||
    !OIDC_CLIENT_ID ||
    !OIDC_CLIENT_SECRET ||
    !OIDC_REDIRECT_URI
  ) {
    return null;
  }

  return {
    issuer: OIDC_ISSUER,
    clientId: OIDC_CLIENT_ID,
    clientSecret: OIDC_CLIENT_SECRET,
    redirectUri: OIDC_REDIRECT_URI,
  };
}

export function isOidcEnabled() {
  return getOidcSettings() !== null;
}

// Découverte paresseuse et mise en cache : l'app doit démarrer même si
// Authelia est momentanément injoignable. Un échec vide le cache pour que la
// tentative suivante refasse la découverte.
let cachedConfiguration: Promise<oidc.Configuration> | null = null;

export function getOidcConfiguration(settings: OidcSettings) {
  if (!cachedConfiguration) {
    // client_secret_basic explicite : openid-client v6 utilise
    // client_secret_post par défaut, qu'Authelia refuse (son défaut est basic).
    cachedConfiguration = oidc
      .discovery(
        new URL(settings.issuer),
        settings.clientId,
        undefined,
        oidc.ClientSecretBasic(settings.clientSecret),
      )
      .catch((error: unknown) => {
        cachedConfiguration = null;
        throw error;
      });
  }

  return cachedConfiguration;
}

/**
 * Le rôle applicatif est piloté par les groupes Authelia : membre du groupe
 * "parents" (OIDC_ADMIN_GROUP) -> ADMIN, sinon CHILD. Re-synchronisé à chaque
 * login pour que le Secret authelia-users reste la source de vérité.
 */
export function roleFromGroups(groups: unknown): Role {
  if (Array.isArray(groups) && groups.includes(env.OIDC_ADMIN_GROUP)) {
    return Role.ADMIN;
  }

  return Role.CHILD;
}
