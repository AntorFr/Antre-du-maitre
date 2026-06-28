import { mkdir, appendFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';

import { env } from '../config/env.js';

type LlmErrorLogInput = {
  kind: 'scenario-chat' | 'act-detail' | 'session-debrief';
  provider: string;
  model?: string;
  error: unknown;
  prompt: string;
  rawResponse: string;
  context: Record<string, unknown>;
};

const PROJECT_ROOT_LOG_DIR = fileURLToPath(
  new URL('../../../logs/llm-errors', import.meta.url),
);

export async function writeLlmErrorLog(input: LlmErrorLogInput) {
  const logDir = resolveLogDir();
  const now = new Date();
  const file = resolve(logDir, `llm-errors-${now.toISOString().slice(0, 10)}.jsonl`);

  const payload = {
    timestamp: now.toISOString(),
    kind: input.kind,
    provider: input.provider,
    model: input.model,
    context: input.context,
    error: serializeError(input.error),
    prompt: input.prompt,
    rawResponse: input.rawResponse,
  };

  try {
    await mkdir(logDir, {
      recursive: true,
    });
    await appendFile(file, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (logError) {
    console.error('Failed to write LLM error log.', serializeError(logError));
  }
}

function resolveLogDir() {
  const configured = env.LLM_ERROR_LOG_DIR;

  if (configured) {
    return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  }

  return env.NODE_ENV === 'production' ? '/data/logs' : PROJECT_ROOT_LOG_DIR;
}

function serializeError(error: unknown) {
  if (error instanceof ZodError) {
    return {
      name: error.name,
      message: error.message,
      issues: error.issues,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}
