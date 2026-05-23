export type DrsMonsterImport = {
  slug: string;
  name: string;
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
  stats: Record<string, string>;
  attacks: string[];
  abilities: string[];
  rawData?: unknown;
};

