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
    return this.client !== null;
  }

  public async generateText(request: AICompletionRequest): Promise<AICompletionResponse<string>> {
    if (!this.client) {
      throw new Error('Gemini AI Provider is not configured. GEMINI_API_KEY is required.');
    }

    const response = await this.client.models.generateContent({
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
  }

  public async generateStructured<T>(request: AICompletionRequest): Promise<AICompletionResponse<T>> {
    if (!this.client) {
      throw new Error('Gemini AI Provider is not configured. GEMINI_API_KEY is required.');
    }

    const response = await this.client.models.generateContent({
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
  }
}

export const geminiProvider = new GeminiProvider();
