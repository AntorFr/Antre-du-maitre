import { env } from '../../config/env.js';
import { AnthropicTransport } from './anthropic-transport.js';
import { ClaudeAgentTransport } from './claude-agent-transport.js';
import { JsonLlmProvider } from './json-provider.js';
import { MockLlmProvider } from './mock-provider.js';
import type { LlmProvider } from './types.js';

export function createLlmProvider(): LlmProvider {
  switch (env.LLM_PROVIDER) {
    case 'anthropic':
      return new JsonLlmProvider(new AnthropicTransport());
    case 'claude-agent':
      return new JsonLlmProvider(new ClaudeAgentTransport());
    default:
      return new MockLlmProvider();
  }
}
