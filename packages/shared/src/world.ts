export type EntityType = 'LIEU' | 'PNJ' | 'FACTION' | 'EVENEMENT' | 'REGLE';

export type WorldEntitySource = 'CREATION' | 'DEBRIEF' | 'MANUAL';

export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ProposedWorldEntity {
  type: EntityType;
  name: string;
  description: string;
  tags: string[];
  source: WorldEntitySource;
}

export interface WorldEntity extends ProposedWorldEntity {
  id: string;
  sourceScenarioId?: string | null;
  sourceSessionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorldEntityProposal extends ProposedWorldEntity {
  id: string;
  scenarioId?: string | null;
  sessionId?: string | null;
  status: ProposalStatus;
  createdAt: string;
  reviewedAt?: string | null;
}

