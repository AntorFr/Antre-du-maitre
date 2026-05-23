import type { FastifyInstance } from 'fastify';

import {
  ALL_BATTLE_MATS,
  BATTLE_MATS_VOL1,
  BATTLE_MATS_VOL2,
  BATTLE_MATS_VOL3,
} from '../data/battle-mats/index.js';
import { PROFILES, RULES } from '../data/cof-mini.js';
import { GAMEPLAY_TYPES } from '../data/gameplay-types.js';
import { prisma } from '../lib/prisma.js';
import { searchMonsters } from '../services/monsters.js';

export async function registerCofRoutes(app: FastifyInstance) {
  app.get('/api/cof/battlemats', async () => ALL_BATTLE_MATS);

  app.get('/api/cof/battlemats/:volume', async (request, reply) => {
    const { volume } = request.params as { volume: string };

    if (volume === '1') return BATTLE_MATS_VOL1;
    if (volume === '2') return BATTLE_MATS_VOL2;
    if (volume === '3') return BATTLE_MATS_VOL3;

    return reply.code(404).send({
      message: `Unknown Battle Mats volume: ${volume}`,
    });
  });

  app.get('/api/cof/gameplay-types', async () => GAMEPLAY_TYPES);
  app.get('/api/cof/profiles', async () => PROFILES);
  app.get('/api/cof/rules', async () => RULES);

  app.get('/api/cof/monsters', async (request) => {
    const query = request.query as {
      q?: string;
      limit?: string;
      environment?: string;
      maxNc?: string;
    };

    const limit = parsePositiveInt(query.limit, 50);
    const maxNc =
      query.maxNc === undefined ? undefined : Number.parseFloat(query.maxNc);

    const monsters = await searchMonsters({
      query: normalizeQueryValue(query.q),
      environment: normalizeQueryValue(query.environment),
      limit,
      maxNc: Number.isFinite(maxNc) ? maxNc : undefined,
    });

    return { monsters };
  });

  app.get('/api/cof/monsters/:idOrSlug', async (request, reply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    const monster = await prisma.monster.findFirst({
      where: {
        OR: [
          {
            id: idOrSlug,
          },
          {
            slug: idOrSlug,
          },
        ],
      },
    });

    if (!monster) {
      return reply.code(404).send({
        message: `Unknown monster: ${idOrSlug}`,
      });
    }

    return { monster };
  });
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeQueryValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
