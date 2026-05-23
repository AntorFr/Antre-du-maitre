import type { PrismaClient } from '@prisma/client';

import { DRS_MONSTER_FIXTURE } from '../../data/drs-monsters-fixture.js';
import {
  extractCreatureSlugsFromListPage,
  parseCreatureDetailPage,
} from './parser.js';
import type { DrsMonsterImport } from './types.js';

const BASE_URL = 'https://www.co-drs.org';
const CREATURES_URL = `${BASE_URL}/fr/bestiaire/creatures`;

export type ImportDrsBestiaryOptions = {
  prisma: PrismaClient;
  useFixture?: boolean;
  maxPages?: number;
  maxCreatures?: number;
};

export async function importDrsBestiary({
  prisma,
  useFixture = false,
  maxPages = 40,
  maxCreatures,
}: ImportDrsBestiaryOptions) {
  const monsters = useFixture
    ? DRS_MONSTER_FIXTURE
    : await fetchAllDrsMonsters({ maxPages, maxCreatures });

  for (const monster of monsters) {
    await prisma.monster.upsert({
      where: {
        slug: monster.slug,
      },
      update: toPrismaMonster(monster),
      create: {
        id: `co-drs-${monster.slug}`,
        ...toPrismaMonster(monster),
      },
    });
  }

  return {
    imported: monsters.length,
  };
}

async function fetchAllDrsMonsters(options: {
  maxPages: number;
  maxCreatures?: number;
}): Promise<DrsMonsterImport[]> {
  const slugs = await fetchCreatureSlugs(options.maxPages);
  const selectedSlugs = options.maxCreatures
    ? slugs.slice(0, options.maxCreatures)
    : slugs;
  const monsters: DrsMonsterImport[] = [];

  for (const slug of selectedSlugs) {
    const html = await fetchText(`${CREATURES_URL}/${slug}`);
    monsters.push(parseCreatureDetailPage(html, slug));
  }

  return monsters;
}

async function fetchCreatureSlugs(maxPages: number): Promise<string[]> {
  const slugs = new Set<string>();

  for (let page = 0; page < maxPages; page++) {
    const url = page === 0 ? CREATURES_URL : `${CREATURES_URL}?page=${page}`;
    const html = await fetchText(url);
    const pageSlugs = extractCreatureSlugsFromListPage(html);
    const before = slugs.size;

    for (const slug of pageSlugs) {
      slugs.add(slug);
    }

    if (page > 0 && slugs.size === before) {
      break;
    }
  }

  return [...slugs];
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'antre-du-maitre-dev-importer/0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function toPrismaMonster(monster: DrsMonsterImport) {
  return {
    slug: monster.slug,
    name: monster.name,
    source: 'CO_DRS',
    sourceUrl: monster.sourceUrl,
    nc: monster.nc,
    family: monster.family,
    category: monster.category,
    environment: monster.environment,
    archetype: monster.archetype,
    size: monster.size,
    def: monster.def,
    pv: monster.pv,
    initiative: monster.initiative,
    stats: monster.stats,
    attacks: monster.attacks,
    abilities: monster.abilities,
    rawData: monster.rawData ?? {},
  };
}

