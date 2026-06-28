import type { ScenarioData, ScenarioStep } from './scenario.js';
import type { ProposedWorldEntity } from './world.js';

export interface ScenarioChatResponse {
  reply: string;
  suggestions: string[];
  scenarioUpdate: Partial<ScenarioData> | null;
  proposedEntities: ProposedWorldEntity[];
  stepComplete: boolean;
  nextStep: ScenarioStep | null;
}

export interface SessionDebriefResponse {
  reply: string;
  suggestions: string[];
  proposedEntities: ProposedWorldEntity[];
  debriefComplete: boolean;
}
