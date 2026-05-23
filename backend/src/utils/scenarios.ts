import type {
  ScenarioChatHistoryEntry,
  ScenarioDetail,
  ScenarioSummary,
} from '@antre-du-maitre/shared';
import { Prisma, type Scenario } from '@prisma/client';

import { normalizeScenarioData } from '../domain/scenario-state.js';

export function toScenarioSummary(scenario: Scenario): ScenarioSummary {
  return {
    id: scenario.id,
    title: scenario.title,
    status: scenario.status,
    data: normalizeScenarioData(scenario.data),
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
  };
}

export function toScenarioDetail(scenario: Scenario): ScenarioDetail {
  return {
    ...toScenarioSummary(scenario),
    chatHistory: readScenarioChatHistory(scenario.chatHistory),
  };
}

function readScenarioChatHistory(
  value: Prisma.JsonValue,
): ScenarioChatHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry): ScenarioChatHistoryEntry[] => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return [];
    }

    const candidate = entry as Record<string, Prisma.JsonValue>;
    const role = candidate.role;
    const content = candidate.content;
    const createdAt = candidate.createdAt;

    if (
      (role !== 'assistant' && role !== 'user') ||
      typeof content !== 'string' ||
      typeof createdAt !== 'string'
    ) {
      return [];
    }

    const voiceInput =
      typeof candidate.voiceInput === 'boolean'
        ? candidate.voiceInput
        : undefined;
    const suggestions = Array.isArray(candidate.suggestions)
      ? candidate.suggestions.filter(
          (suggestion): suggestion is string => typeof suggestion === 'string',
        )
      : undefined;

    return [
      {
        role,
        content,
        createdAt,
        ...(voiceInput !== undefined ? { voiceInput } : {}),
        ...(suggestions && suggestions.length > 0 ? { suggestions } : {}),
      },
    ];
  });
}
