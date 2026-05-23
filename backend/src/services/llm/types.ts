import type {
  MonsterSummary,
  ScenarioChatResponse,
  ScenarioData,
  SessionDebriefResponse,
} from '@antre-du-maitre/shared';

export interface ScenarioChatInput {
  message: string;
  voiceInput: boolean;
  scenario: ScenarioData;
  worldSummary: string;
  monsterCatalog: MonsterSummary[];
}

export interface SessionDebriefInput {
  message: string;
  scenario: ScenarioData;
  sessionNumber: number;
  worldSummary: string;
}

export interface LlmProvider {
  createScenarioTurn(input: ScenarioChatInput): Promise<ScenarioChatResponse>;
  createSessionDebriefTurn(
    input: SessionDebriefInput,
  ): Promise<SessionDebriefResponse>;
}
