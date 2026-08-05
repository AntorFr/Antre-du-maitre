import {
  SCENARIO_SECTIONS,
  computeScenarioSections,
  firstIncompleteScenarioSection,
  sectionForScenarioDataKey,
  type ProposedWorldEntity,
  type ScenarioChatResponse,
  type ScenarioData,
  type ScenarioSection,
} from '@antre-du-maitre/shared';

import { normalizeScenarioData } from '../../domain/scenario-state.js';

/**
 * Tour de scénario brut produit par un provider (LLM ou mock), avant les
 * champs dérivés côté serveur.
 */
export interface ScenarioTurnDraft {
  reply: string;
  suggestions: string[];
  scenarioUpdate: Partial<ScenarioData> | null;
  proposedEntities: ProposedWorldEntity[];
  /** Chaîne libre : filtrée contre SCENARIO_SECTIONS ici. */
  focusSection?: string | null;
  validationRequested?: boolean;
}

/**
 * Complète un tour de scénario avec les champs dérivés des données :
 * sections modifiées, focus valide, prêt-à-valider.
 */
export function composeScenarioChatResponse(
  draft: ScenarioTurnDraft,
  scenario: ScenarioData,
): ScenarioChatResponse {
  const nextData = normalizeScenarioData({
    ...scenario,
    ...(draft.scenarioUpdate ?? {}),
  });
  const nextSections = computeScenarioSections(nextData);
  const readyToValidate = SCENARIO_SECTIONS.every(
    (section) => nextSections[section] === 'COMPLETE',
  );
  const focusCandidate = draft.focusSection ?? null;
  const focusSection =
    focusCandidate &&
    (SCENARIO_SECTIONS as readonly string[]).includes(focusCandidate)
      ? (focusCandidate as ScenarioSection)
      : firstIncompleteScenarioSection(nextSections);
  const changedSections = Array.from(
    new Set(
      Object.keys(draft.scenarioUpdate ?? {})
        .map((key) => sectionForScenarioDataKey(key))
        .filter((section): section is ScenarioSection => section !== null),
    ),
  );

  return {
    reply: draft.reply,
    suggestions: toSuggestionList(draft.suggestions),
    scenarioUpdate: draft.scenarioUpdate,
    proposedEntities: draft.proposedEntities,
    changedSections,
    focusSection,
    readyToValidate,
    validationRequested: draft.validationRequested ?? false,
  };
}

export function toSuggestionList(values: string[]): string[] {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 6);

  return normalized.length > 0
    ? normalized
    : ['Continuer', 'Changer un détail', 'Aide-moi'];
}

export function normalizeProposedEntities(
  entities: Array<Omit<ProposedWorldEntity, 'tags'> & { tags?: string[] }>,
  source: ProposedWorldEntity['source'],
): ProposedWorldEntity[] {
  return entities.map((entity) => ({
    ...entity,
    tags: entity.tags ?? [],
    source,
  }));
}
