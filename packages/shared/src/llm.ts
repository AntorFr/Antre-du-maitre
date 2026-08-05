import type { ScenarioData } from './scenario.js';
import type { ScenarioSection } from './scenario-sections.js';
import type { ProposedWorldEntity } from './world.js';

export interface ScenarioChatResponse {
  reply: string;
  suggestions: string[];
  scenarioUpdate: Partial<ScenarioData> | null;
  proposedEntities: ProposedWorldEntity[];
  /** Sections touchées par scenarioUpdate (calculées côté serveur). */
  changedSections: ScenarioSection[];
  /**
   * Prochaine section conseillée par Merlin (celle de sa question) ; null
   * quand tout est complet et qu'il propose le récap/la validation.
   */
  focusSection: ScenarioSection | null;
  /** Toutes les sections sont complètes (calculé côté serveur). */
  readyToValidate: boolean;
  /** L'utilisateur a demandé la validation finale du scénario. */
  validationRequested: boolean;
}

export interface SessionDebriefResponse {
  reply: string;
  suggestions: string[];
  proposedEntities: ProposedWorldEntity[];
  debriefComplete: boolean;
}
