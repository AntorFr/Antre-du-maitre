// Systèmes de jeu supportés. Le système vit dans ScenarioData (pas de
// migration de colonne) ; les scénarios antérieurs sont COF_MINI par défaut.

export const GAME_SYSTEMS = ['COF_MINI', 'DND'] as const;

export type GameSystem = (typeof GAME_SYSTEMS)[number];

export const DEFAULT_GAME_SYSTEM: GameSystem = 'COF_MINI';

export const GAME_SYSTEM_LABELS: Record<GameSystem, string> = {
  COF_MINI: 'Chroniques Oubliées Mini',
  DND: 'Donjons & Dragons',
};

/** Le bestiaire CoF DRS et les Battle Mats n'existent qu'en CoF Mini. */
export function gameSystemHasCofTooling(system: GameSystem): boolean {
  return system === 'COF_MINI';
}
