export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AICompletionRequest {
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
}

export interface AICompletionResponse<T = unknown> {
  text: string;
  parsed?: T;
  usage?: TokenUsage;
  finishReason?: string;
}

export interface ModelConfig {
  modelName: string;
  temperature: number;
  maxTokens?: number;
}
