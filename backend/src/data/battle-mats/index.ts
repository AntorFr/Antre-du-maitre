// battle-mats/index.ts
// Point d'entrée unique pour toutes les cartes Battle Mats (Loke Battle Mats)
// Volumes 1, 2 et 3 — à compléter avec le volume 3 quand disponible

import type { BattleMat, BattleMatTag } from './types.js';
export type { BattleMat, BattleMatTag } from './types.js';

// Import des volumes (réexportés depuis leurs fichiers respectifs)
import { BATTLE_MATS_VOL1 } from './vol1.js';
import { BATTLE_MATS_VOL2 } from './vol2.js';
import { BATTLE_MATS_VOL3 } from './vol3.js';

export { BATTLE_MATS_VOL1, BATTLE_MATS_VOL2, BATTLE_MATS_VOL3 };

// Catalogue complet — 92 cartes (31 + 31 + 30 doubles-pages)
export const ALL_BATTLE_MATS: BattleMat[] = [
  ...BATTLE_MATS_VOL1,
  ...BATTLE_MATS_VOL2,
  ...BATTLE_MATS_VOL3,
];

// ─────────────────────────────────────────
// Helpers pour l'API et le LLM
// ─────────────────────────────────────────

/**
 * Recherche des cartes par tags et/ou volume
 */
export function searchBattleMats(options: {
  tags?: BattleMatTag[];
  volume?: 1 | 2 | 3;
  typeDefi?: string;
}): BattleMat[] {
  return ALL_BATTLE_MATS.filter((mat) => {
    const matchVol = options.volume ? mat.volume === options.volume : true;
    const matchTags = options.tags?.length
      ? options.tags.some((t) => mat.tags.includes(t))
      : true;
    const matchDefi = options.typeDefi
      ? mat.typesDefis.includes(options.typeDefi)
      : true;
    return matchVol && matchTags && matchDefi;
  });
}

/**
 * Résumé compact de toutes les cartes pour injection dans le prompt LLM
 * Format court pour ne pas saturer le contexte
 */
export function getAllBattleMatsSummaryForLLM(): string {
  return ALL_BATTLE_MATS.map(
    (m) =>
      `${m.id} | Vol.${m.volume} p.${m.pages[0]}-${m.pages[1]} | "${m.nomFr}" | Tags: ${m.tags.join(', ')} | ${m.description.slice(0, 100)}...`
  ).join('\n');
}

/**
 * Détail d'une carte par son id
 */
export function getBattleMatById(id: string): BattleMat | undefined {
  return ALL_BATTLE_MATS.find((m) => m.id === id);
}

/**
 * Résumé d'une sélection de cartes pour l'affichage dans l'app
 */
export function formatBattleMatForDisplay(mat: BattleMat): string {
  return [
    `${mat.id} — ${mat.nomFr}`,
    `Volume ${mat.volume}, pages ${mat.pages[0]}-${mat.pages[1]}`,
    mat.description,
    `Tags : ${mat.tags.join(' • ')}`,
  ].join('\n');
}

/**
 * Suggestions de cartes pour une rencontre donnée
 * Utilisé pour préparer les cartes dans les workflows d'acte et la todo.
 * Retourne max 3 cartes pertinentes
 */
export function suggestBattleMatsForEncounter(options: {
  typeDefi: string;
  ambiance: string;  // 'mystere' | 'humour' | 'action' | 'frisson' | 'merveilleux' | 'exploration'
  tags?: BattleMatTag[];
}): BattleMat[] {
  const ambianceTagMap: Record<string, BattleMatTag[]> = {
    mystere:  ['foret', 'donjon', 'souterrain', 'temple', 'marais'],
    humour:   ['village', 'batiment', 'exterieur', 'taverne'],
    action:   ['plaine', 'combat', 'montagne', 'exterieur'],
    frisson:  ['donjon', 'souterrain', 'lave', 'marais', 'glace'],
    merveilleux: ['temple', 'foret', 'eau', 'jour'],
    exploration: ['exploration', 'voyage', 'souterrain', 'exterieur'],
  };

  const ambianceTags = ambianceTagMap[options.ambiance] ?? [];
  const allTags = [...(options.tags ?? []), ...ambianceTags];

  const results = searchBattleMats({
    tags: allTags as BattleMatTag[],
    typeDefi: options.typeDefi,
  });

  // Dédoublonnage et limite à 3 suggestions
  const seen = new Set<string>();
  return results.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  }).slice(0, 3);
}
