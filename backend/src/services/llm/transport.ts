// Abstraction transport : le moteur JSON (json-provider.ts) construit les
// prompts et valide les réponses ; le transport ne fait qu'envoyer un échange
// (system + messages) à un modèle et rendre le texte brut de la réponse.

export interface LlmTransportMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionInput {
  system: string;
  messages: LlmTransportMessage[];
  maxTokens: number;
  /**
   * Si fourni et supporté par le transport, reçoit le texte brut accumulé de
   * la réponse au fil de la génération (JSON en cours d'écriture).
   */
  onTextDelta?: (rawTextSoFar: string) => void;
}

export interface LlmTextTransport {
  /** Nom du provider, utilisé dans les logs d'erreur LLM. */
  readonly name: string;
  readonly model: string;
  complete(input: LlmCompletionInput): Promise<string>;
}
