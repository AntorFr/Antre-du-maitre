import type {
  ActDetailChatRequest,
  ActDetailStep,
  MonsterSummary,
  ScenarioChatResponse,
  ScenarioData,
  SessionDebriefResponse,
} from '@antre-du-maitre/shared';

export interface ScenarioChatInput {
  message: string;
  voiceInput: boolean;
  scenarioId?: string;
  userId?: string;
  scenario: ScenarioData;
  worldSummary: string;
  monsterCatalog: MonsterSummary[];
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
