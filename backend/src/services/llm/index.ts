import { env } from '../../config/env.js';
import { AnthropicLlmProvider } from './anthropic-provider.js';
import { MockLlmProvider } from './mock-provider.js';
import type { LlmProvider } from './types.js';

export function createLlmProvider(): LlmProvider {
  if (env.LLM_PROVIDER === 'anthropic') {
    return new AnthropicLlmProvider();
  }

  return new MockLlmProvider();
}

