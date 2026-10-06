import type { IAIProvider } from './provider.interface.ts';
import type { AICompletionRequest, AICompletionResponse } from './types.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';

export interface OllamaModelTag {
  name: string;
  model?: string;
  size?: number;
  digest?: string;
  modified_at?: string;
}

export interface OllamaTagsResponse {
  models?: OllamaModelTag[];
}

export class OllamaJsonParseError extends Error {
  constructor(message: string, public readonly rawText: string) {
    super(message);
    this.name = 'OllamaJsonParseError';
  }
}

/**
 * Strips markdown code fences (```json ... ```) and extracts valid JSON objects/arrays.
 */
export function extractAndParseJson<T>(rawText: string): T {
  let cleaned = (rawText || '').trim();

  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  }

  // 1. First attempt: Direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch (initialErr) {
    // 2. Second attempt: Extract balanced JSON block
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = -1;
    let endChar = '';

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endChar = '}';
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endChar = ']';
    }

    if (startIdx !== -1) {
      const lastIdx = cleaned.lastIndexOf(endChar);
      if (lastIdx > startIdx) {
        const candidate = cleaned.slice(startIdx, lastIdx + 1);
        try {
          return JSON.parse(candidate) as T;
        } catch {
          // fall through to error
        }
      }
    }

    throw new OllamaJsonParseError(
      `Failed to parse JSON response from Ollama: ${initialErr instanceof Error ? initialErr.message : String(initialErr)}`,
      rawText
    );
  }
}

export class OllamaProvider implements IAIProvider {
  public readonly providerName = 'ollama';

  private readonly baseUrl: string;
  private readonly configuredModel: string;
  private readonly timeoutMs: number;

  private _lastKnownAvailable: boolean | null = null;
  private _lastCheckedAt: number = 0;
  private _cachedModels: string[] = [];
  private readonly CACHE_TTL_MS = 20000; // 20s cache for availability checks

  constructor(options?: { baseUrl?: string; model?: string; timeoutMs?: number }) {
    this.baseUrl = (options?.baseUrl || env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
    this.configuredModel = options?.model || env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
    this.timeoutMs = options?.timeoutMs ?? env.OLLAMA_TIMEOUT_MS ?? 120000;

    // Trigger initial non-blocking availability check
    if (process.env.NODE_ENV !== 'test') {
      this.checkAvailability().catch(() => {});
    }
  }

  public get modelName(): string {
    return this.configuredModel;
  }

  public getCachedModels(): string[] {
    return [...this._cachedModels];
  }

  /**
   * Helper to check if a tag returned by Ollama matches the requested model.
   * Handles tags like "qwen2.5-coder:7b" and "qwen2.5-coder:7b:latest".
   */
  private matchesModel(tag: string, target: string): boolean {
    const normTag = tag.trim().toLowerCase();
    const normTarget = target.trim().toLowerCase();

    if (normTag === normTarget) return true;
    if (normTag === `${normTarget}:latest`) return true;
    if (`${normTag}:latest` === normTarget) return true;

    // Handle bare name matching (e.g. qwen2.5-coder matches qwen2.5-coder:latest)
    const [tagBase] = normTag.split(':');
    const [targetBase] = normTarget.split(':');
    if (normTag.startsWith(normTarget) || normTarget.startsWith(normTag)) return true;
    if (tagBase === targetBase && normTag.includes(normTarget)) return true;

    return false;
  }

  /**
   * Full asynchronous health and model availability check against Ollama /api/tags.
   */
  public async checkAvailability(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`Ollama service returned non-200 status (${response.status}) at ${this.baseUrl}`);
        this._lastKnownAvailable = false;
        this._lastCheckedAt = Date.now();
        return false;
      }

      const data = (await response.json()) as OllamaTagsResponse;
      const models = Array.isArray(data.models) ? data.models : [];
      this._cachedModels = models.map((m) => m.name || m.model || '').filter(Boolean);

      const hasConfiguredModel = this._cachedModels.some((name) =>
        this.matchesModel(name, this.configuredModel)
      );

      if (!hasConfiguredModel) {
        logger.warn(
          `Ollama is running, but model "${this.configuredModel}" was not found. Available models: [${this._cachedModels.join(', ')}]. Please run: ollama pull ${this.configuredModel}`
        );
        this._lastKnownAvailable = false;
        this._lastCheckedAt = Date.now();
        return false;
      }

      this._lastKnownAvailable = true;
      this._lastCheckedAt = Date.now();
      return true;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
      if (isAbort) {
        logger.warn(`Ollama health check timed out at ${this.baseUrl}`);
      } else {
        logger.warn('Ollama unavailable', {
          baseUrl: this.baseUrl,
          error: err instanceof Error ? err.message : 'Connection refused or unreachable',
        });
      }
      this._lastKnownAvailable = false;
      this._lastCheckedAt = Date.now();
      return false;
    }
  }

  /**
   * Synchronous availability check required by IAIProvider.
   * Returns last known availability, refreshing asynchronously if cache expired.
   */
  public isAvailable(): boolean {
    const now = Date.now();
    if (this._lastKnownAvailable === null || now - this._lastCheckedAt > this.CACHE_TTL_MS) {
      // Trigger background refresh
      this.checkAvailability().catch(() => {});
      // If never checked before, assume false until verified
      return this._lastKnownAvailable ?? false;
    }
    return this._lastKnownAvailable;
  }

  /**
   * Sets cached availability state directly (useful for tests and manual resets).
   */
  public setAvailability(available: boolean): void {
    this._lastKnownAvailable = available;
    this._lastCheckedAt = Date.now();
  }

  /**
   * Executes a native HTTP request to Ollama with configurable timeout and retry.
   */
  private async executeHttpRequest(
    endpoint: string,
    body: Record<string, unknown>,
    attempt = 1
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        // 404 typically means model not found
        if (response.status === 404) {
          throw new Error(
            `Ollama model "${this.configuredModel}" not found (404). Please run: ollama pull ${this.configuredModel}`
          );
        }

        // Retry transient 5xx errors once
        if (attempt === 1 && response.status >= 500) {
          logger.warn(`Ollama HTTP ${response.status} server error, retrying once...`);
          await new Promise((r) => setTimeout(r, 1000));
          return this.executeHttpRequest(endpoint, body, 2);
        }

        throw new Error(`Ollama request failed (${response.status}): ${errorText || response.statusText}`);
      }

      return await response.json();
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
      if (isAbort) {
        throw new Error(`Ollama request timed out after ${this.timeoutMs}ms (${this.baseUrl})`);
      }

      // Retry transient network drop once
      if (attempt === 1) {
        const msg = err instanceof Error ? err.message : '';
        const isTransient = msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('fetch failed');
        if (isTransient && !msg.includes('ECONNREFUSED')) {
          logger.warn('Ollama transient connection issue, retrying once...', { error: msg });
          await new Promise((r) => setTimeout(r, 1000));
          return this.executeHttpRequest(endpoint, body, 2);
        }
      }

      throw err;
    }
  }

  public async generateText(request: AICompletionRequest): Promise<AICompletionResponse<string>> {
    const systemPrompt = request.systemPrompt || 'Return a clear, concise and actionable response.';
    const prompt = request.prompt;

    const payload = {
      model: this.configuredModel,
      prompt,
      system: systemPrompt,
      stream: false,
      options: {
        temperature: request.temperature ?? 0.7,
        num_predict: request.maxOutputTokens,
      },
    };

    const data = await this.executeHttpRequest('/api/generate', payload);

    const generatedText = (data.response || data.message?.content || '').trim();
    const promptTokens = data.prompt_eval_count || 0;
    const completionTokens = data.eval_count || 0;

    return {
      text: generatedText,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason: data.done_reason || (data.done ? 'stop' : undefined),
    };
  }

  public async generateStructured<T>(request: AICompletionRequest): Promise<AICompletionResponse<T>> {
    const defaultStructuredSystemPrompt =
      'You are a structured startup analysis agent. Return ONLY valid JSON matching the requested schema. Do not include markdown, explanations, or code fences.';

    const systemPrompt = request.systemPrompt
      ? `${request.systemPrompt}\n${defaultStructuredSystemPrompt}`
      : defaultStructuredSystemPrompt;

    const payload = {
      model: this.configuredModel,
      prompt: request.prompt,
      system: systemPrompt,
      format: 'json',
      stream: false,
      options: {
        temperature: request.temperature ?? 0.2,
        num_predict: request.maxOutputTokens,
      },
    };

    // First attempt
    const data = await this.executeHttpRequest('/api/generate', payload);
    const rawText = (data.response || data.message?.content || '').trim();

    try {
      const parsed = extractAndParseJson<T>(rawText);
      const promptTokens = data.prompt_eval_count || 0;
      const completionTokens = data.eval_count || 0;

      return {
        text: rawText,
        parsed,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: data.done_reason || (data.done ? 'stop' : undefined),
      };
    } catch (parseErr) {
      logger.warn('Ollama returned invalid JSON. Retrying once with strict JSON repair instruction...', {
        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });

      // Retry once with a reinforced strict JSON instruction
      const retryPayload = {
        ...payload,
        prompt: `${request.prompt}\n\nIMPORTANT: Your previous output was not valid JSON. You MUST output ONLY valid JSON. No conversational text, no commentary, no markdown ticks.`,
        system: `${systemPrompt} Return strictly valid JSON. Do not include any text outside the JSON structure.`,
      };

      const retryData = await this.executeHttpRequest('/api/generate', retryPayload);
      const retryRawText = (retryData.response || retryData.message?.content || '').trim();

      const parsed = extractAndParseJson<T>(retryRawText);
      const promptTokens = (data.prompt_eval_count || 0) + (retryData.prompt_eval_count || 0);
      const completionTokens = (data.eval_count || 0) + (retryData.eval_count || 0);

      return {
        text: retryRawText,
        parsed,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        finishReason: retryData.done_reason || (retryData.done ? 'stop' : undefined),
      };
    }
  }
}

export const ollamaProvider = new OllamaProvider();
