import { GoogleGenAI } from '@google/genai';
import type { IAIProvider } from './provider.interface.ts';
import type { AICompletionRequest, AICompletionResponse } from './types.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';

export class GeminiProvider implements IAIProvider {
  public readonly providerName = 'google-gemini';
  public readonly modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  private client: GoogleGenAI | null = null;

  constructor() {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.client = new GoogleGenAI({ apiKey });
        logger.info(`Gemini AI Provider initialized successfully with model: ${this.modelName}`);
      } catch (err) {
        logger.warn('Failed to initialize Gemini AI Provider', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  public isAvailable(): boolean {
    if (process.env.NODE_ENV === 'test') {
      return false;
    }
    return this.client !== null;
  }

  /**
   * Helper that retries transient capacity spikes (e.g. 503 or 429) up to 2 times with backoff.
   */
  private async executeWithRetry<R>(operation: () => Promise<R>, maxRetries = 2): Promise<R> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (err: unknown) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isTransient = errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('high demand') || errMsg.includes('quota');

        if (attempt <= maxRetries && isTransient) {
          logger.warn(`Gemini API transient rate/demand spike (attempt ${attempt}/${maxRetries}), retrying after backoff...`, {
            model: this.modelName,
          });
          await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
        } else {
          break;
        }
      }
    }
    throw lastError;
  }

  public async generateText(request: AICompletionRequest): Promise<AICompletionResponse<string>> {
    if (!this.client) {
      throw new Error('Gemini AI Provider is not configured. GEMINI_API_KEY is required.');
    }

    return await this.executeWithRetry(async () => {
      const response = await this.client!.models.generateContent({
        model: this.modelName,
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
    if (!this.client) {
      throw new Error('Gemini AI Provider is not configured. GEMINI_API_KEY is required.');
    }

    return await this.executeWithRetry(async () => {
      const response = await this.client!.models.generateContent({
        model: this.modelName,
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
