import type { MonsterSummary } from '@antre-du-maitre/shared';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';

const monsterSummarySelect = {
  id: true,
  slug: true,
  name: true,
  source: true,
  sourceUrl: true,
  nc: true,
  family: true,
  category: true,
  environment: true,
  archetype: true,
  size: true,
  def: true,
  pv: true,
  initiative: true,
} satisfies Prisma.MonsterSelect;

export async function searchMonsters(options: {
  query?: string;
  limit?: number;
  environment?: string;
  maxNc?: number;
}): Promise<MonsterSummary[]> {
  const where: Prisma.MonsterWhereInput = {};

  const searchTerms = buildSearchTerms(options.query);

  if (searchTerms.length > 0) {
    where.OR = searchTerms.flatMap((term) => [
      {
        name: {
          contains: term,
        },
      },
      {
        slug: {
          contains: term,
        },
      },
      {
        family: {
          contains: term,
        },
      },
      {
        category: {
          contains: term,
        },
      },
    ]);
  }

  if (options.environment) {
    where.environment = {
      contains: options.environment,
    };
  }

  const monsters = await prisma.monster.findMany({
    where,
    select: monsterSummarySelect,
    orderBy: {
      name: 'asc',
    },
    take: Math.min(options.limit ?? 50, 200),
  });

  if (options.maxNc === undefined) {
    return monsters;
  }

  return monsters.filter((monster) => {
    const nc = parseNc(monster.nc);
    return nc === null ? true : nc <= options.maxNc!;
  });
}

export function parseNc(nc: string | null): number | null {
  if (!nc) return null;
  if (nc === '½' || nc === '1/2') return 0.5;
  if (nc === '¼' || nc === '1/4') return 0.25;

  const parsed = Number.parseFloat(nc.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildSearchTerms(query: string | undefined): string[] {
  if (!query) return [];

  const stopWords = new Set([
    'avec',
    'dans',
    'des',
    'les',
    'une',
    'un',
    'finale',
    'rencontre',
    'voleur',
  ]);

  return query
    .toLowerCase()
    .split(/[^a-z0-9àâçéèêëîïôûùüÿñæœ-]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3 && !stopWords.has(term))
    .slice(0, 6);
}
