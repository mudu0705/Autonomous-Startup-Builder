import { GoogleGenAI } from '@google/genai';
import type { IAIProvider } from './provider.interface.ts';
import type { AICompletionRequest, AICompletionResponse } from './types.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';

export class GeminiProvider implements IAIProvider {
  public readonly providerName = 'google-gemini';
  private client: GoogleGenAI | null = null;

  // Ordered candidate models: prioritizes flash-lite for high throughput and separate free-tier quota pool
  private readonly candidateModels: string[] = ([
    'gemini-3.1-flash-lite',
    process.env.GEMINI_MODEL,
    'gemini-3.8-flash',
  ].filter((m): m is string => typeof m === 'string' && m.trim().length > 0))
    .filter((m, idx, arr) => arr.indexOf(m) === idx);

  // Set of models that have hit daily free-tier quota limits (e.g., 20/day) during this session
  private readonly exhaustedModels = new Set<string>();

  public get modelName(): string {
    const active = this.candidateModels.find((m) => !this.exhaustedModels.has(m));
    return active || this.candidateModels[0] || 'gemini-3.1-flash-lite';
  }

  constructor() {
    this.getClient();
  }

  private getClient(): GoogleGenAI | null {
    if (this.client) {
      return this.client;
    }
    const apiKey = (env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.client = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
        logger.info(`Gemini AI Provider initialized successfully with primary model: ${this.modelName}`);
        return this.client;
      } catch (err) {
        logger.warn('Failed to initialize Gemini AI Provider', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        return null;
      }
    }
    return null;
  }

  public isAvailable(): boolean {
    if (process.env.NODE_ENV === 'test') {
      return false;
    }
    return this.getClient() !== null;
  }

  /**
   * Executes an operation with automatic model failover and transient retry.
   * If a model hits permanent daily quota exhaustion (429 / RESOURCE_EXHAUSTED),
   * it fails over to the next candidate model immediately without waiting.
   */
  private async executeWithModelFailover<R>(
    operation: (client: GoogleGenAI, model: string) => Promise<R>
  ): Promise<R> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Gemini AI Provider is not configured. GEMINI_API_KEY is required.');
    }

    let lastError: unknown;

    // Filter available models that haven't been marked as exhausted
    const modelsToTry = this.candidateModels.filter((m) => !this.exhaustedModels.has(m));
    if (modelsToTry.length === 0) {
      // If all candidate models have hit quota, clear and try fresh or throw
      throw new Error('All Gemini candidate models have reached quota limits. Falling back to deterministic mode.');
    }

    for (const model of modelsToTry) {
      const maxRetries = 1;
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          return await operation(client, model);
        } catch (err: unknown) {
          lastError = err;
          const errMsg = err instanceof Error ? err.message : String(err);
          const isDailyQuota =
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('Quota exceeded') ||
            errMsg.includes('free_tier_requests') ||
            errMsg.includes('Please retry in');
          const isTransientCapacity =
            errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('temporarily unavailable');

          if (isDailyQuota) {
            // Mark model as exhausted so we don't hammer it again
            this.exhaustedModels.add(model);
            logger.warn(`Gemini model ${model} daily quota exhausted. Failing over to next candidate model...`);
            break; // Break retry loop on this model, try next candidate model immediately
          }

          if (attempt <= maxRetries && isTransientCapacity) {
            logger.warn(`Gemini API transient capacity spike on ${model} (attempt ${attempt}/${maxRetries}), retrying...`);
            await new Promise((resolve) => setTimeout(resolve, 800));
          } else {
            break;
          }
        }
      }
    }

    throw lastError;
  }

  public async generateText(request: AICompletionRequest): Promise<AICompletionResponse<string>> {
    return await this.executeWithModelFailover(async (client, model) => {
      const response = await client.models.generateContent({
        model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemPrompt,
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxOutputTokens,
        },
      });

      return {
        text: response.text || '',
      };
    });
  }

  public async generateStructured<T>(request: AICompletionRequest): Promise<AICompletionResponse<T>> {
    return await this.executeWithModelFailover(async (client, model) => {
      const response = await client.models.generateContent({
        model,
        contents: request.prompt,
        config: {
          systemInstruction: request.systemPrompt,
          temperature: request.temperature ?? 0.2,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text) as T;

      return {
        text,
        parsed,
      };
    });
  }
}

export const geminiProvider = new GeminiProvider();
