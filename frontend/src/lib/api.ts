import type {
  AuthUser,
  ActDetailChatRequest,
  ActDetailChatResponse,
  CreateScenarioRequest,
  EntityType,
  LoginRequest,
  LoginResponse,
  MonsterDetail,
  MonsterSummary,
  ScenarioChatRequest,
  ScenarioChatResponse,
  ScenarioDetail,
  ScenarioSession,
  ScenarioSummary,
  SessionDebriefRequest,
  SessionDebriefResponse,
  TodoItem,
  WorldEntity,
  WorldEntityProposal,
} from '@antre-du-maitre/shared';

const DEFAULT_API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

type ApiErrorPayload = {
  message?: string;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;

    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }

    throw new ApiError(
      response.status,
      payload?.message ?? `Request failed with status ${response.status}.`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestBlob(
  path: string,
  token?: string | null,
): Promise<Blob> {
  const headers = new Headers();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      message = payload.message ?? message;
    } catch {
      // Keep generic message for non-JSON errors.
    }

    throw new ApiError(response.status, message);
  }

  return response.blob();
}

export const api = {
  login(input: LoginRequest) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  me(token: string) {
    return request<{ user: AuthUser }>('/auth/me', {}, token);
  },

  listScenarios(token: string) {
    return request<{ scenarios: ScenarioSummary[] }>('/scenarios', {}, token);
  },

  createScenario(token: string, input: CreateScenarioRequest) {
    return request<{ scenario: ScenarioSummary }>(
      '/scenarios',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  getScenario(token: string, scenarioId: string) {
    return request<{ scenario: ScenarioDetail }>(
      `/scenarios/${scenarioId}`,
      {},
      token,
    );
  },

  deleteScenario(token: string, scenarioId: string) {
    return request<void>(
      `/scenarios/${scenarioId}`,
      {
        method: 'DELETE',
      },
      token,
    );
  },

  exportScenarioPdf(token: string, scenarioId: string) {
    return requestBlob(`/scenarios/${scenarioId}/export.pdf`, token);
  },

  chat(token: string, scenarioId: string, input: ScenarioChatRequest) {
    return request<ScenarioChatResponse>(
      `/scenarios/${scenarioId}/chat`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  chatActDetail(
    token: string,
    scenarioId: string,
    actNumber: number,
    input: ActDetailChatRequest,
  ) {
    return request<ActDetailChatResponse>(
      `/scenarios/${scenarioId}/acts/${actNumber}/detail/chat`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  listTodo(token: string, scenarioId: string) {
    return request<{ items: TodoItem[] }>(
      `/scenarios/${scenarioId}/todo`,
      {},
      token,
    );
  },

  updateTodoItem(
    token: string,
    scenarioId: string,
    itemId: string,
    input: { done: boolean },
  ) {
    return request<{ item: TodoItem }>(
      `/scenarios/${scenarioId}/todo/${itemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  listSessions(token: string, scenarioId: string) {
    return request<{ sessions: ScenarioSession[] }>(
      `/scenarios/${scenarioId}/sessions`,
      {},
      token,
    );
  },

  markSessionPlayed(token: string, scenarioId: string, sessionNumber: number) {
    return request<{ session: ScenarioSession }>(
      `/scenarios/${scenarioId}/sessions/${sessionNumber}/mark-played`,
      {
        method: 'POST',
      },
      token,
    );
  },

  debriefSession(
    token: string,
    scenarioId: string,
    sessionNumber: number,
    input: SessionDebriefRequest,
  ) {
    return request<SessionDebriefResponse & { session: ScenarioSession }>(
      `/scenarios/${scenarioId}/sessions/${sessionNumber}/debrief`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  getWorld(token: string) {
    return request<{
      world: {
        id: string;
        userId: string;
        entities: WorldEntity[];
        proposals: WorldEntityProposal[];
      };
    }>('/world', {}, token);
  },

  updateWorldEntity(
    token: string,
    entityId: string,
    input: Partial<{
      type: EntityType;
      name: string;
      description: string;
      tags: string[];
    }>,
  ) {
    return request<{ entity: WorldEntity }>(
      `/world/entities/${entityId}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  deleteWorldEntity(token: string, entityId: string) {
    return request<void>(
      `/world/entities/${entityId}`,
      {
        method: 'DELETE',
      },
      token,
    );
  },

  acceptWorldProposal(token: string, proposalId: string) {
    return request<{ entity: WorldEntity; proposal: WorldEntityProposal }>(
      `/world/proposals/${proposalId}/accept`,
      {
        method: 'POST',
      },
      token,
    );
  },

  rejectWorldProposal(token: string, proposalId: string) {
    return request<{ proposal: WorldEntityProposal }>(
      `/world/proposals/${proposalId}/reject`,
      {
        method: 'POST',
      },
      token,
    );
  },

  listMonsters(options: {
    q?: string;
    limit?: number;
    environment?: string;
    maxNc?: number;
  } = {}) {
    const search = new URLSearchParams();

    if (options.q) search.set('q', options.q);
    if (options.limit) search.set('limit', String(options.limit));
    if (options.environment) search.set('environment', options.environment);
    if (options.maxNc !== undefined) search.set('maxNc', String(options.maxNc));

    const suffix = search.size > 0 ? `?${search.toString()}` : '';
    return request<{ monsters: MonsterSummary[] }>(`/cof/monsters${suffix}`);
  },

  getMonster(idOrSlug: string) {
    return request<{ monster: MonsterDetail }>(`/cof/monsters/${idOrSlug}`);
  },

  listUsers(token: string) {
    return request<{
      users: Array<AuthUser & { scenarioCount: number }>;
    }>('/users', {}, token);
  },

  createUser(
    token: string,
    input: {
      username: string;
      password: string;
      role: AuthUser['role'];
    },
  ) {
    return request<{ user: AuthUser }>(
      '/users',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },

  resetUserPassword(token: string, userId: string, password: string) {
    return request<void>(
      `/users/${userId}/password`,
      {
        method: 'PUT',
        body: JSON.stringify({ password }),
      },
      token,
    );
  },

  deleteUser(token: string, userId: string) {
    return request<void>(
      `/users/${userId}`,
      {
        method: 'DELETE',
      },
      token,
    );
  },

  adminListUserScenarios(token: string, userId: string) {
    return request<{ scenarios: ScenarioSummary[] }>(
      `/admin/users/${userId}/scenarios`,
      {},
      token,
    );
  },

  adminGetUserWorld(token: string, userId: string) {
    return request<{
      world: {
        id: string;
        userId: string;
        entities: WorldEntity[];
        proposals: WorldEntityProposal[];
      };
    }>(`/admin/users/${userId}/world`, {}, token);
  },

  adminCreateWorldEntity(
    token: string,
    userId: string,
    input: {
      type: EntityType;
      name: string;
      description: string;
      tags: string[];
    },
  ) {
    return request<{ entity: WorldEntity }>(
      `/admin/users/${userId}/world/entities`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },
};
