import type { DrsMonsterImport } from './types.js';

const CREATURE_PATH_PATTERN = /href=["']\/fr\/bestiaire\/creatures\/([a-z0-9-]+)["']/gi;
const BASE_URL = 'https://www.co-drs.org';

export function extractCreatureSlugsFromListPage(html: string): string[] {
  const slugs = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = CREATURE_PATH_PATTERN.exec(html))) {
    const slug = match[1];

    if (slug && slug !== 'creatures') {
      slugs.add(slug);
    }
  }

  return [...slugs];
}

export function parseCreatureDetailPage(
  html: string,
  slug: string,
): DrsMonsterImport {
  const lines = htmlToTextLines(html);
  const name =
    findHeadingName(html) ??
    findFirstCreatureLikeName(lines) ??
    humanizeSlug(slug);

  const joined = lines.join('\n');

  return {
    slug,
    name,
    sourceUrl: `${BASE_URL}/fr/bestiaire/creatures/${slug}`,
    nc: valueAfterLine(lines, 'NC'),
    family: valueAfterLine(lines, 'Famille de créature'),
    def: numberAfterLine(lines, 'DEF'),
    pv: numberAfterLine(lines, 'PV'),
    initiative: numberAfterLine(lines, 'Init'),
    category: matchAfterLabel(joined, 'Catégorie de créature'),
    environment: matchAfterLabel(joined, 'Milieu naturel'),
    archetype: matchAfterLabel(joined, 'Archétype'),
    size: matchAfterLabel(joined, 'Taille'),
    stats: parseStats(joined),
    attacks: sectionLines(lines, 'Attaque(s)', 'Capacité(s) spéciales'),
    abilities: sectionLines(lines, 'Capacité(s) spéciales', 'Rejoignez la communauté'),
    rawData: {
      source: 'co-drs-html',
      parsedAt: new Date().toISOString(),
    },
  };
}

function htmlToTextLines(html: string): string[] {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h1|h2|h3|dt|dd|section|article|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '\n'),
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç');
}

function findHeadingName(html: string): string | null {
  const match = html.match(/<h1[^>]*>\s*([^<]+)\s*<\/h1>/i);
  return match?.[1]?.trim() || null;
}

function findFirstCreatureLikeName(lines: string[]): string | null {
  const breadcrumbIndex = lines.findIndex((line) => line === 'Fil d’Ariane' || line === "Fil d'Ariane");
  const ncIndex = lines.findIndex((line) => line === 'NC');
  const searchEnd = ncIndex > -1 ? ncIndex : Math.min(lines.length, 20);

  for (let index = 0; index < searchEnd; index++) {
    const line = lines[index];
    if (!line) continue;
    if (line.length > 80) continue;
    if (['Chroniques Oubliées DRS', 'Navigation principale', 'Bestiaire'].includes(line)) continue;
    if (breadcrumbIndex > -1 && index >= breadcrumbIndex) break;
    if (/^[A-ZÉÈÀÂÎÏÔÙÛÇ]/.test(line) && !line.includes('Image')) {
      return line;
    }
  }

  return null;
}

function valueAfterLine(lines: string[], label: string): string | null {
  const index = lines.findIndex((line) => line === label);
  return index >= 0 ? lines[index + 1] ?? null : null;
}

function numberAfterLine(lines: string[], label: string): number | null {
  const value = valueAfterLine(lines, label);
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchAfterLabel(text: string, label: string): string | null {
  const match = text.match(new RegExp(`${escapeRegExp(label)}\\s+([^\\n]+)`, 'i'));
  return match?.[1]?.trim() ?? null;
}

function parseStats(text: string): Record<string, string> {
  const stats: Record<string, string> = {};
  const pattern = /\b(FOR|DEX|CON|INT|SAG|CHA)\s+([+-]\d+\*?)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    const statName = match[1];
    const statValue = match[2];

    if (statName && statValue) {
      stats[statName] = statValue;
    }
  }

  return stats;
}

function sectionLines(
  lines: string[],
  startLabel: string,
  endLabel: string,
): string[] {
  const startIndex = lines.findIndex((line) => line === startLabel);
  if (startIndex < 0) return [];

  const endIndex = lines.findIndex(
    (line, index) => index > startIndex && line === endLabel,
  );

  return lines
    .slice(startIndex + 1, endIndex > -1 ? endIndex : undefined)
    .filter((line) => !line.startsWith('Image:') && line !== 'Image')
    .filter((line) => !['Rejoignez la communauté !'].includes(line));
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
