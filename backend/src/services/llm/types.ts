import type {
  ActDetailChatRequest,
  ActDetailStep,
  MonsterSummary,
  ScenarioChatResponse,
  ScenarioData,
  ScenarioSection,
  SessionDebriefResponse,
} from '@antre-du-maitre/shared';

export interface ScenarioChatInput {
  message: string;
  voiceInput: boolean;
  /** Section demandée explicitement par l'utilisateur (clic checklist). */
  focusSection?: ScenarioSection;
  scenarioId?: string;
  userId?: string;
  scenario: ScenarioData;
  worldSummary: string;
  monsterCatalog: MonsterSummary[];
  /**
   * Si fourni, le provider diffuse le texte de `reply` au fil de sa
   * génération (texte accumulé à chaque appel). La réponse finale reste
   * validée et retournée normalement.
   */
  onReplyDelta?: (replySoFar: string) => void;
}

export interface SessionDebriefInput {
  message: string;
  scenarioId?: string;
  userId?: string;
  scenario: ScenarioData;
  sessionNumber: number;
  worldSummary: string;
}

export interface ActDetailInput {
  scenarioId?: string;
  userId?: string;
  scenario: ScenarioData;
  actNumber: number;
  request: ActDetailChatRequest;
}

export interface ActDetailTurnResponse {
  scenario: ScenarioData;
  reply: string;
  suggestions: string[];
  changedSections: ActDetailStep[];
}

export interface LlmProvider {
  createScenarioTurn(input: ScenarioChatInput): Promise<ScenarioChatResponse>;
  createActDetailTurn(input: ActDetailInput): Promise<ActDetailTurnResponse>;
  createSessionDebriefTurn(
    input: SessionDebriefInput,
  ): Promise<SessionDebriefResponse>;
}
