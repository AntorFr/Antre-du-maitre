import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import { requireAdmin } from '../middleware/auth.js';
import {
  getClaudeSetupSession,
  getClaudeTokenStatus,
  startClaudeSetupSession,
} from '../services/claude-token.js';

const submitCodeSchema = z.object({
  sessionId: z.string().min(1),
  code: z.string().trim().min(8).max(4_000),
});

// Génération du token OAuth d'abonnement Claude depuis l'admin : le backend
// pilote `claude setup-token`, l'admin ouvre l'URL, autorise, puis colle le
// code. Le token n'est JAMAIS renvoyé au client ni loggé.
export async function registerClaudeTokenRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/claude-token/status',
    {
      preHandler: requireAdmin,
    },
    async () => getClaudeTokenStatus(),
  );

  app.post(
    '/api/admin/claude-token/start',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const session = await startClaudeSetupSession();

      if (session.state === 'error' || !session.authorizeUrl) {
        request.log.error(
          { claudeSetupError: session.error },
          'claude setup-token start failed',
        );

        return reply.code(502).send({
          message: session.error ?? "Impossible de démarrer la génération.",
        });
      }

      return {
        sessionId: session.sessionId,
        authorizeUrl: session.authorizeUrl,
      };
    },
  );

  app.post(
    '/api/admin/claude-token/code',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const parsed = submitCodeSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid payload.',
          issues: parsed.error.issues,
        });
      }

      const session = getClaudeSetupSession(parsed.data.sessionId);

      if (!session) {
        return reply.code(404).send({
          message: 'Session inconnue ou expirée — relance la génération.',
        });
      }

      try {
        await session.submitCode(parsed.data.code);
      } catch (error) {
        return reply.code(409).send({
          message: error instanceof Error ? error.message : 'Session invalide.',
        });
      }

      const view = session.view();

      if (view.state !== 'done') {
        request.log.error(
          { claudeSetupError: view.error },
          'claude setup-token exchange failed',
        );

        return reply.code(502).send({
          message: view.error ?? "L'échange du code a échoué.",
        });
      }

      return getClaudeTokenStatus();
    },
  );
}
