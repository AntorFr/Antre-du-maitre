import Anthropic from '@anthropic-ai/sdk';

import { env } from '../../config/env.js';
import type { LlmCompletionInput, LlmTextTransport } from './transport.js';

/**
 * Transport API Anthropic directe (facturation à la clé API).
 */
export class AnthropicTransport implements LlmTextTransport {
  readonly name = 'anthropic';
  readonly model = env.ANTHROPIC_MODEL;

  private readonly client: Anthropic;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
    }

    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  async complete(input: LlmCompletionInput): Promise<string> {
    // Le prompt système est volumineux et stable : on le met en cache
    // Anthropic pour réduire latence et coût des tours successifs.
    const request = {
      model: this.model,
      max_tokens: input.maxTokens,
      temperature: 0.4,
      system: [
        {
          type: 'text' as const,
          text: input.system,
          cache_control: { type: 'ephemeral' as const },
        },
      ],
      messages: input.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };

    if (input.onTextDelta) {
      const stream = this.client.messages.stream(request);
      const onTextDelta = input.onTextDelta;

      stream.on('text', (_delta, snapshot) => {
        onTextDelta(snapshot);
      });

      const finalMessage = await stream.finalMessage();
      return extractText(finalMessage);
    }

    const message = await this.client.messages.create(request);
    return extractText(message);
  }
}

function extractText(message: Anthropic.Message): string {
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Anthropic returned no text content.');
  }

  return text;
}
