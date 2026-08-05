import { query } from '@anthropic-ai/claude-agent-sdk';

import { env } from '../../config/env.js';
import { getStoredClaudeToken } from '../claude-token.js';
import type {
  LlmCompletionInput,
  LlmTextTransport,
  LlmTransportMessage,
} from './transport.js';

/**
 * Transport Claude Agent SDK : consomme l'abonnement Claude (Pro/Max) au lieu
 * de facturer une clé API. Le SDK pilote le runtime Claude Code embarqué dans
 * le paquet npm et s'authentifie via CLAUDE_CODE_OAUTH_TOKEN (généré une fois
 * avec `claude setup-token`) ou, en dev, via les credentials `claude login`
 * de la machine.
 *
 * Usage volontairement minimal : un tour unique, aucun outil, prompt système
 * custom — le SDK ne sert que de tuyau vers le modèle.
 */
export class ClaudeAgentTransport implements LlmTextTransport {
  readonly name = 'claude-agent';
  readonly model = env.ANTHROPIC_MODEL;

  async complete(input: LlmCompletionInput): Promise<string> {
    let raw = '';
    let result: string | null = null;
    let failure: string | null = null;

    // Token généré depuis l'admin (fenêtre setup-token) : prioritaire sur
    // l'environnement, prise d'effet immédiate sans redémarrage.
    const storedToken = await getStoredClaudeToken();

    for await (const message of query({
      prompt: renderPrompt(input.messages),
      options: {
        systemPrompt: input.system,
        model: this.model,
        maxTurns: 1,
        allowedTools: [],
        permissionMode: 'dontAsk',
        includePartialMessages: Boolean(input.onTextDelta),
        ...(storedToken
          ? {
              env: {
                ...(process.env as Record<string, string>),
                CLAUDE_CODE_OAUTH_TOKEN: storedToken,
              },
            }
          : {}),
      },
    })) {
      if (message.type === 'stream_event' && input.onTextDelta) {
        const event = message.event;

        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          raw += event.delta.text;
          input.onTextDelta(raw);
        }
      } else if (message.type === 'result') {
        if (message.subtype === 'success') {
          result = message.result;
        } else {
          failure = message.subtype;
        }
      }
    }

    if (result === null) {
      throw new Error(
        `Claude Agent SDK returned no result (${failure ?? 'no result message'}).`,
      );
    }

    return result.trim();
  }
}

/**
 * Le SDK ne prend qu'un prompt utilisateur par requête : les tours de
 * correction (user → assistant fautif → consigne) sont repliés en un seul
 * message qui cite la réponse fautive.
 */
function renderPrompt(messages: LlmTransportMessage[]): string {
  if (messages.length === 1 && messages[0]) {
    return messages[0].content;
  }

  return messages
    .map((message) =>
      message.role === 'assistant'
        ? `Ta réponse précédente était :\n${message.content}`
        : message.content,
    )
    .join('\n\n');
}
