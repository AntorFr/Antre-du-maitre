export type SessionStatus = 'PLANNED' | 'PLAYED';

export interface ScenarioSession {
  id: string;
  scenarioId: string;
  number: number;
  plannedActes: number[];
  plannedDuration?: number | null;
  recapHook?: string | null;
  status: SessionStatus;
  playedAt?: string | null;
  debriefHistory?: unknown;
  debriefSummary?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDebriefRequest {
  message: string;
}

