import type { ScenarioData, ScenarioStep } from './scenario.js';

// Le scénario n'est plus construit comme un escalier d'étapes mais comme une
// fiche en sections : chaque section a un statut dérivé des DONNÉES du
// scénario (pas d'un pointeur d'étape). La discussion avec Merlin est libre —
// un même tour peut remplir plusieurs sections, dans n'importe quel ordre.

export const SCENARIO_SECTIONS = [
  'SENSATION',
  'LIEU',
  'QUETE',
  'ANTAGONISTE',
  'OBJECTIF_HEROS',
  'ACTES',
  'PNJS',
  'DUREE',
  'FIN',
] as const;

export type ScenarioSection = (typeof SCENARIO_SECTIONS)[number];

export type ScenarioSectionStatus = 'EMPTY' | 'PARTIAL' | 'COMPLETE';

export type ScenarioSectionMap = Record<ScenarioSection, ScenarioSectionStatus>;

/**
 * Étape héritée équivalente, conservée dans ScenarioData.currentStep pour la
 * compatibilité des données déjà stockées et des écrans qui l'affichent.
 */
export const SECTION_TO_STEP: Record<ScenarioSection, ScenarioStep> = {
  SENSATION: 'STEP_1_SENSATION',
  LIEU: 'STEP_2_LIEU',
  QUETE: 'STEP_3_QUETE',
  ANTAGONISTE: 'STEP_4_ANTAGONISTE',
  OBJECTIF_HEROS: 'STEP_5_OBJECTIF_HEROS',
  ACTES: 'STEP_6_ACTES',
  PNJS: 'STEP_7_PNJS',
  DUREE: 'STEP_8_DUREE',
  FIN: 'STEP_9_FIN',
};

export function computeScenarioSections(data: ScenarioData): ScenarioSectionMap {
  return {
    SENSATION: data.ambiance ? 'COMPLETE' : 'EMPTY',
    LIEU: statusOf(data.lieu, [data.lieu?.nom, data.lieu?.description]),
    QUETE: statusOf(data.quete, [
      data.quete?.phraseSimple,
      data.quete?.ceQuiNeVaPas,
      data.quete?.pourquoiCestGrave,
      data.quete?.pourquoiMaintenant,
      data.quete?.ceQuiArriveSiPersonneNagit,
    ]),
    ANTAGONISTE: statusOf(data.antagoniste, [
      data.antagoniste?.nom,
      data.antagoniste?.nature,
      data.antagoniste?.motivation,
    ]),
    OBJECTIF_HEROS: statusOf(data.objectifDesHeros, [
      data.objectifDesHeros?.phraseSimple,
      data.objectifDesHeros?.objectifVisible,
      data.objectifDesHeros?.signeDeReussite,
    ]),
    ACTES:
      data.actes.length === 0
        ? 'EMPTY'
        : data.actes.length >= 3 &&
            data.actes.every((acte) => filled(acte.titre) && filled(acte.description))
          ? 'COMPLETE'
          : 'PARTIAL',
    PNJS:
      data.pnjs.length === 0
        ? 'EMPTY'
        : data.pnjs.some((pnj) => filled(pnj.nom) && filled(pnj.description))
          ? 'COMPLETE'
          : 'PARTIAL',
    DUREE: statusOf(data.sessionning, [
      data.sessionning && data.sessionning.dureeTotaleEstimeeMin > 0
        ? 'ok'
        : undefined,
      data.sessionning?.sessions.length ? 'ok' : undefined,
    ]),
    FIN: statusOf(data.fin, [
      data.fin?.conditionDeVictoire,
      data.fin?.sceneDeResolution,
      data.fin?.recompense,
    ]),
  };
}

export function isScenarioReadyToValidate(data: ScenarioData): boolean {
  const sections = computeScenarioSections(data);

  return SCENARIO_SECTIONS.every((section) => sections[section] === 'COMPLETE');
}

/**
 * Prochaine section utile par défaut : la première non complète (ordre
 * indicatif seulement — le modèle peut proposer un autre focus).
 */
export function firstIncompleteScenarioSection(
  sections: ScenarioSectionMap,
): ScenarioSection | null {
  return (
    SCENARIO_SECTIONS.find((section) => sections[section] !== 'COMPLETE') ?? null
  );
}

/**
 * currentStep hérité, dérivé des données : STEP_10_RECAP quand tout est
 * complet, sinon l'étape de la première section incomplète.
 */
export function deriveScenarioStep(data: ScenarioData): ScenarioStep {
  const focus = firstIncompleteScenarioSection(computeScenarioSections(data));

  return focus ? SECTION_TO_STEP[focus] : 'STEP_10_RECAP';
}

/**
 * Section correspondant à une clé racine de ScenarioData modifiée par un
 * scenarioUpdate ; null pour les clés hors sections (title, notesMJ…).
 */
export function sectionForScenarioDataKey(key: string): ScenarioSection | null {
  switch (key) {
    case 'ambiance':
      return 'SENSATION';
    case 'lieu':
      return 'LIEU';
    case 'quete':
      return 'QUETE';
    case 'antagoniste':
      return 'ANTAGONISTE';
    case 'objectifDesHeros':
      return 'OBJECTIF_HEROS';
    case 'actes':
      return 'ACTES';
    case 'pnjs':
      return 'PNJS';
    case 'sessionning':
      return 'DUREE';
    case 'fin':
    case 'recompense':
      return 'FIN';
    default:
      return null;
  }
}

function filled(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

function statusOf(
  container: unknown,
  requiredValues: Array<string | undefined>,
): ScenarioSectionStatus {
  if (!container) {
    return 'EMPTY';
  }

  return requiredValues.every((value) => filled(value)) ? 'COMPLETE' : 'PARTIAL';
}
