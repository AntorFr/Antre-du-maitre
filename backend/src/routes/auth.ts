import * as oidcClient from 'openid-client';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import {
  getOidcConfiguration,
  getOidcSettings,
  isOidcEnabled,
  roleFromGroups,
} from '../services/oidc.js';
import { upsertOidcUser, verifyPassword } from '../services/users.js';
import { toAuthUser } from '../utils/users.js';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

// Cookie signé portant state + PKCE entre la redirection Authelia et le callback.
const OIDC_TX_COOKIE = 'antre_oidc_tx';

const oidcTxSchema = z.object({
  state: z.string().min(1),
  codeVerifier: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid login payload.',
        issues: parsed.error.issues,
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        username: parsed.data.username,
      },
      include: {
        world: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
      return reply.code(401).send({
        message: 'Invalid username or password.',
      });
    }

    const token = await reply.jwtSign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
      },
      {
        sign: {
          expiresIn: '30d',
        },
      },
    );

    return {
      token,
      user: toAuthUser(user),
    };
  });

  app.get(
    '/api/auth/me',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: {
          id: request.user.sub,
        },
        include: {
          world: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user) {
        return reply.code(404).send({
          message: 'User not found.',
        });
      }

      return {
        user: toAuthUser(user),
      };
    },
  );

  app.post(
    '/api/auth/logout',
    {
      preHandler: authenticate,
    },
    async (_request, reply) => reply.code(204).send(),
  );

  app.get('/api/auth/config', async () => ({
    oidcEnabled: isOidcEnabled(),
  }));

  app.get('/api/auth/oidc/login', async (_request, reply) => {
    const settings = getOidcSettings();

    if (!settings) {
      return reply.code(404).send({
        message: 'OIDC login is not configured.',
      });
    }

    const configuration = await getOidcConfiguration(settings);

    const codeVerifier = oidcClient.randomPKCECodeVerifier();
    const codeChallenge =
      await oidcClient.calculatePKCECodeChallenge(codeVerifier);
    const state = oidcClient.randomState();

    const authorizationUrl = oidcClient.buildAuthorizationUrl(configuration, {
      redirect_uri: settings.redirectUri,
      scope: 'openid profile email groups',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    const transaction = Buffer.from(
      JSON.stringify({
        state,
        codeVerifier,
      }),
    ).toString('base64url');

    reply.setCookie(OIDC_TX_COOKIE, transaction, {
      path: '/api/auth/oidc',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      signed: true,
      maxAge: 600,
    });

    return reply.redirect(authorizationUrl.href);
  });

  app.get('/api/auth/oidc/callback', async (request, reply) => {
    const settings = getOidcSettings();

    if (!settings) {
      return reply.code(404).send({
        message: 'OIDC login is not configured.',
      });
    }

    reply.clearCookie(OIDC_TX_COOKIE, {
      path: '/api/auth/oidc',
    });

    try {
      const rawTransaction = request.cookies[OIDC_TX_COOKIE];

      if (!rawTransaction) {
        throw new Error('Missing OIDC transaction cookie.');
      }

      const unsigned = request.unsignCookie(rawTransaction);

      if (!unsigned.valid || !unsigned.value) {
        throw new Error('Invalid OIDC transaction cookie signature.');
      }

      const transaction = oidcTxSchema.parse(
        JSON.parse(Buffer.from(unsigned.value, 'base64url').toString('utf8')),
      );

      const configuration = await getOidcConfiguration(settings);

      // request.url = chemin + query string ; l'origine vient du redirect URI.
      const currentUrl = new URL(request.url, settings.redirectUri);

      const tokens = await oidcClient.authorizationCodeGrant(
        configuration,
        currentUrl,
        {
          pkceCodeVerifier: transaction.codeVerifier,
          expectedState: transaction.state,
        },
      );

      const claims = tokens.claims();

      if (!claims) {
        throw new Error('Missing ID token claims.');
      }

      // Les groupes (scope "groups") sont exposés via le endpoint userinfo.
      const userInfo = await oidcClient.fetchUserInfo(
        configuration,
        tokens.access_token,
        claims.sub,
      );

      const username =
        typeof userInfo.preferred_username === 'string'
          ? userInfo.preferred_username.trim()
          : '';

      if (!username) {
        throw new Error('Missing preferred_username claim.');
      }

      const user = await upsertOidcUser({
        username,
        role: roleFromGroups(userInfo.groups),
      });

      const token = await reply.jwtSign(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
        },
        {
          sign: {
            expiresIn: '30d',
          },
        },
      );

      // Token transmis en fragment d'URL : jamais envoyé au serveur ni loggé.
      return reply.redirect(`/#oidc-token=${token}`);
    } catch (error) {
      request.log.error({ err: error }, 'OIDC login failed.');
      return reply.redirect('/#oidc-error=1');
    }
  });
}
