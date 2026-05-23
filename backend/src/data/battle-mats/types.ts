export type BattleMatTag =
  | 'interieur'
  | 'exterieur'
  | 'foret'
  | 'donjon'
  | 'village'
  | 'montagne'
  | 'eau'
  | 'plaine'
  | 'souterrain'
  | 'batiment'
  | 'temple'
  | 'taverne'
  | 'marais'
  | 'desert'
  | 'lave'
  | 'glace'
  | 'cote'
  | 'combat'
  | 'exploration'
  | 'rencontre'
  | 'voyage'
  | 'jour'
  | 'nuit';

export interface BattleMat {
  id: string;
  volume: 1 | 2 | 3;
  pages: [number, number];
  nom: string;
  nomFr: string;
  description: string;
  tags: BattleMatTag[];
  ambiances: string[];
  typesDefis: string[];
}

