export interface MonsterSummary {
  id: string;
  slug: string;
  name: string;
  source: string;
  sourceUrl: string;
  nc?: string | null;
  family?: string | null;
  category?: string | null;
  environment?: string | null;
  archetype?: string | null;
  size?: string | null;
  def?: number | null;
  pv?: number | null;
  initiative?: number | null;
}

export interface MonsterDetail extends MonsterSummary {
  stats: unknown;
  attacks: unknown;
  abilities: unknown;
  rawData?: unknown;
  importedAt: string;
  updatedAt: string;
}

