import type { ScenarioData } from '@antre-du-maitre/shared';
import type { TodoCategory } from '@prisma/client';

import {
  ALL_BATTLE_MATS,
  type BattleMat,
  type BattleMatTag,
} from '../data/battle-mats/index.js';

export type GeneratedTodoItem = {
  category: TodoCategory;
  label: string;
  order: number;
};

export function generateMockTodoItems(
  scenario: ScenarioData,
): GeneratedTodoItem[] {
  const items: GeneratedTodoItem[] = [];
  let order = 1;

  if (scenario.antagoniste) {
    items.push({
      category: 'FICHES_PNJS',
      label: `Préparer l'antagoniste : ${scenario.antagoniste.nom}`,
      order: order++,
    });
  }

  for (const pnj of scenario.pnjs) {
    items.push({
      category: 'FICHES_PNJS',
      label: `Préparer la fiche PNJ : ${pnj.nom}`,
      order: order++,
    });
  }

  for (const rencontre of scenario.rencontres) {
    items.push({
      category: 'FICHES_MONSTRES',
      label: `Préparer ${rencontre.nombre} × ${rencontre.monsterId}`,
      order: order++,
    });

    if (rencontre.carteBattleMat) {
      items.push({
        category: 'CARTES',
        label: `Sortir ${rencontre.carteBattleMat.id} — ${rencontre.carteBattleMat.nom}`,
        order: order++,
      });
    }
  }

  const actesAvecCarte = new Set(
    scenario.rencontres
      .filter((rencontre) => rencontre.carteBattleMat)
      .map((rencontre) => rencontre.acteNumero),
  );

  for (const acte of scenario.actes) {
    if (actesAvecCarte.has(acte.numero)) continue;

    const rencontresDansActe = scenario.rencontres.filter(
      (rencontre) => rencontre.acteNumero === acte.numero,
    );
    const contexte =
      rencontresDansActe.length > 0
        ? ` pour ${rencontresDansActe
            .map((rencontre) => rencontre.contexte)
            .join(' / ')}`
        : '';
    const suggestions = suggestBattleMatsForActe({
      scenario,
      acte,
      rencontres: rencontresDansActe,
    });
    const suggestionText = suggestions.length
      ? ` Suggestions : ${suggestions.map(formatBattleMatSuggestion).join(' ; ')}.`
      : '';

    items.push({
      category: 'CARTES',
      label: `Choisir une Battle Mat pour l'acte ${acte.numero} — ${acte.titre}${contexte}.${suggestionText}`,
      order: order++,
    });
  }

  for (const acte of scenario.actes) {
    const details = acte.detailsMJ;
    if (!details) continue;

    for (const preparation of details.preparation) {
      items.push({
        category: 'DEROULEMENTS',
        label: `Acte ${acte.numero} — ${preparation}`,
        order: order++,
      });
    }

    if (details.indices.length > 0) {
      items.push({
        category: 'DEROULEMENTS',
        label: `Acte ${acte.numero} — Garder les indices prêts : ${details.indices.join(' / ')}`,
        order: order++,
      });
    }
  }

  if (scenario.gameplay?.types.includes('enquete')) {
    items.push({
      category: 'DEROULEMENTS',
      label: 'Préparer 3 indices qui mènent à la solution.',
      order: order++,
    });
  }

  if (scenario.gameplay?.types.includes('enigme')) {
    items.push({
      category: 'DEROULEMENTS',
      label: "Préparer une aide si l'énigme bloque les joueurs.",
      order: order++,
    });
  }

  items.push(
    {
      category: 'DEROULEMENTS',
      label: 'Relire les actes et les options si les joueurs changent de plan.',
      order: order++,
    },
    {
      category: 'AUTRE',
      label: 'Préparer les dés, pions et feuilles utiles.',
      order: order++,
    },
  );

  return items;
}

function suggestBattleMatsForActe({
  scenario,
  acte,
  rencontres,
}: {
  scenario: ScenarioData;
  acte: ScenarioData['actes'][number];
  rencontres: ScenarioData['rencontres'];
}): BattleMat[] {
  const typeDefi = inferBattleMatChallengeType({ scenario, acte, rencontres });
  const tags = inferBattleMatTags({ scenario, acte, rencontres });
  const ambiance = scenario.ambiance ?? 'mystere';

  return ALL_BATTLE_MATS.map((mat) => ({
    mat,
    score: scoreBattleMat({ mat, typeDefi, ambiance, tags }),
  }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.mat.id.localeCompare(b.mat.id))
    .slice(0, 3)
    .map((result) => result.mat);
}

function scoreBattleMat({
  mat,
  typeDefi,
  ambiance,
  tags,
}: {
  mat: BattleMat;
  typeDefi: string;
  ambiance: string;
  tags: BattleMatTag[];
}): number {
  const matchedTags = tags.filter((tag) => mat.tags.includes(tag));
  const matchedCoreTags = matchedTags.filter(
    (tag) =>
      tag !== 'combat' &&
      tag !== 'rencontre' &&
      tag !== 'exploration' &&
      tag !== 'exterieur' &&
      tag !== 'interieur',
  );
  let score = 0;

  if (mat.typesDefis.includes(typeDefi)) score += 5;
  score += matchedTags.length * 2;
  score += matchedCoreTags.length * 5;
  if (mat.ambiances.includes(ambiance)) score += 2;
  if (mat.ambiances.some((matAmbiance) => tags.includes(matAmbiance as BattleMatTag))) {
    score += 2;
  }

  return score;
}

function inferBattleMatChallengeType({
  scenario,
  acte,
  rencontres,
}: {
  scenario: ScenarioData;
  acte: ScenarioData['actes'][number];
  rencontres: ScenarioData['rencontres'];
}): string {
  const explicitType = acte.type.trim().toLowerCase();
  if (explicitType) return explicitType;
  if (rencontres.length > 0) return 'combat';

  const gameplayTypes = scenario.gameplay?.types ?? [];
  if (gameplayTypes.includes('exploration')) return 'exploration';
  if (gameplayTypes.includes('enquete')) return 'enquete';
  if (gameplayTypes.includes('roleplay')) return 'negociation';

  return 'rencontre';
}

function inferBattleMatTags({
  scenario,
  acte,
  rencontres,
}: {
  scenario: ScenarioData;
  acte: ScenarioData['actes'][number];
  rencontres: ScenarioData['rencontres'];
}): BattleMatTag[] {
  const localText = [
    acte.titre,
    acte.type,
    acte.description,
    acte.notesMJ,
    ...acte.options,
    ...rencontres.map((rencontre) => rencontre.contexte),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const scenarioText = [scenario.lieu?.nom, scenario.lieu?.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const tags = new Set<BattleMatTag>();

  collectLocationTags(tags, localText);
  if (!hasSpecificLocationTag(tags)) {
    collectLocationTags(tags, scenarioText);
  }

  if (rencontres.length > 0) tags.add('combat');
  if ((scenario.gameplay?.types ?? []).includes('exploration')) {
    tags.add('exploration');
  }

  return [...tags];
}

function collectLocationTags(tags: Set<BattleMatTag>, text: string) {
  addTagForKeywords(tags, text, ['grotte', 'caverne', 'tunnel'], 'souterrain');
  addTagForKeywords(tags, text, ['falaise', 'côte', 'cote', 'plage', 'mer', 'marée', 'maree'], 'cote');
  addTagForKeywords(tags, text, ['eau', 'noyé', 'noyee', 'englouti', 'port'], 'eau');
  addTagForKeywords(tags, text, ['village', 'marché', 'marche', 'rue'], 'village');
  addTagForKeywords(tags, text, ['taverne', 'auberge'], 'taverne');
  addTagForKeywords(tags, text, ['forêt', 'foret', 'bois'], 'foret');
  addTagForKeywords(tags, text, ['temple', 'sanctuaire', 'autel'], 'temple');
  addTagForKeywords(tags, text, ['donjon', 'ruine', 'crypte', 'tombe'], 'donjon');
  addTagForKeywords(tags, text, ['marais', 'tourbière', 'tourbiere'], 'marais');
  addTagForKeywords(tags, text, ['montagne', 'rocher', 'rocheux'], 'montagne');
  addTagForKeywords(tags, text, ['intérieur', 'interieur', 'maison', 'salle'], 'interieur');
  addTagForKeywords(tags, text, ['extérieur', 'exterieur', 'chemin'], 'exterieur');
}

function hasSpecificLocationTag(tags: Set<BattleMatTag>): boolean {
  return [...tags].some(
    (tag) =>
      tag !== 'combat' &&
      tag !== 'rencontre' &&
      tag !== 'exploration' &&
      tag !== 'exterieur' &&
      tag !== 'interieur',
  );
}

function addTagForKeywords(
  tags: Set<BattleMatTag>,
  text: string,
  keywords: string[],
  tag: BattleMatTag,
) {
  if (keywords.some((keyword) => text.includes(keyword))) {
    tags.add(tag);
  }
}

function formatBattleMatSuggestion(mat: BattleMat): string {
  return `${mat.id} V${mat.volume} p.${mat.pages.join('-')} — ${mat.nomFr}`;
}
