import type { AICompletionRequest, AICompletionResponse } from './types.ts';

/**
 * Pluggable AI Provider Interface.
 * Allows replacing Gemini with Anthropic, OpenAI, or local models without rewriting business logic.
 */
export interface IAIProvider {
  readonly providerName: string;
  readonly modelName: string;

  generateText(request: AICompletionRequest): Promise<AICompletionResponse<string>>;
  generateStructured<T>(request: AICompletionRequest): Promise<AICompletionResponse<T>>;
  isAvailable(): boolean;
}
