import type { IAIProvider } from './provider.interface.ts';
import type { AICompletionRequest, AICompletionResponse } from './types.ts';
import { ollamaProvider, OllamaProvider } from './ollama.provider.ts';
import { geminiProvider, GeminiProvider } from './gemini.provider.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';

export type AIProviderMode = 'ollama' | 'gemini' | 'auto';

export interface AIProviderStatus {
  ollama: {
    available: boolean;
    model: string;
    cachedModels?: string[];
  };
  gemini: {
    available: boolean;
    model: string;
  };
  research?: {
    available: boolean;
  };
  activeProvider: 'ollama' | 'gemini' | 'none';
  configuredMode: AIProviderMode;
}

export class AIProviderManager implements IAIProvider {
  private readonly ollama: OllamaProvider;
  private readonly gemini: GeminiProvider;
  private mode: AIProviderMode;

  constructor(options?: {
    ollama?: OllamaProvider;
    gemini?: GeminiProvider;
    mode?: AIProviderMode;
  }) {
    this.ollama = options?.ollama || ollamaProvider;
    this.gemini = options?.gemini || geminiProvider;
    this.mode = options?.mode || (env.AI_PROVIDER as AIProviderMode) || 'auto';

    logger.info(`AIProviderManager initialized with mode="${this.mode}" (Ollama model: ${this.ollama.modelName}, Gemini model: ${this.gemini.modelName})`);
  }

  public setMode(mode: AIProviderMode): void {
    this.mode = mode;
    logger.info(`AIProviderManager mode switched to "${this.mode}"`);
  }

  public getMode(): AIProviderMode {
    return this.mode;
  }

  public get providerName(): string {
    const active = this.getActiveProvider();
    return active ? active.providerName : 'none';
  }

  public get modelName(): string {
    const active = this.getActiveProvider();
    return active ? active.modelName : 'none';
  }

  /**
   * Returns the primary active provider instance based on configured mode and live availability.
   * Auto mode prioritizes Ollama first, then Gemini.
   */
  public getActiveProvider(): IAIProvider | null {
    if (this.mode === 'ollama') {
      return this.ollama.isAvailable() ? this.ollama : null;
    }

    if (this.mode === 'gemini') {
      return this.gemini.isAvailable() ? this.gemini : null;
    }

    // mode === 'auto'
    // Prioritize 1. Ollama, then 2. Gemini
    if (this.ollama.isAvailable()) {
      return this.ollama;
    }
    if (this.gemini.isAvailable()) {
      return this.gemini;
    }

    return null;
  }

  /**
   * Synchronous check if any configured AI provider is currently available.
   */
  public isAvailable(): boolean {
    if (this.mode === 'ollama') {
      return this.ollama.isAvailable();
    }
    if (this.mode === 'gemini') {
      return this.gemini.isAvailable();
    }
    // 'auto' mode
    return this.ollama.isAvailable() || this.gemini.isAvailable();
  }

  /**
   * Full asynchronous status probe for all providers.
   */
  public async getProviderStatus(): Promise<AIProviderStatus> {
    const ollamaAvail = await this.ollama.checkAvailability();
    const geminiAvail = this.gemini.isAvailable();

    let active: 'ollama' | 'gemini' | 'none' = 'none';

    if (this.mode === 'ollama') {
      active = ollamaAvail ? 'ollama' : 'none';
    } else if (this.mode === 'gemini') {
      active = geminiAvail ? 'gemini' : 'none';
    } else {
      // auto
      if (ollamaAvail) {
        active = 'ollama';
      } else if (geminiAvail) {
        active = 'gemini';
      }
    }

    return {
      ollama: {
        available: ollamaAvail,
        model: this.ollama.modelName,
        cachedModels: this.ollama.getCachedModels(),
      },
      gemini: {
        available: geminiAvail,
        model: this.gemini.modelName,
      },
      activeProvider: active,
      configuredMode: this.mode,
    };
  }

  public async generateText(request: AICompletionRequest): Promise<AICompletionResponse<string>> {
    if (this.mode === 'ollama') {
      if (!this.ollama.isAvailable()) {
        throw new Error(
          `Configured AI Provider is "ollama", but local Ollama service is unavailable or model "${this.ollama.modelName}" is missing.`
        );
      }
      return await this.ollama.generateText(request);
    }

    if (this.mode === 'gemini') {
      if (!this.gemini.isAvailable()) {
        throw new Error('Configured AI Provider is "gemini", but GEMINI_API_KEY is missing or invalid.');
      }
      return await this.gemini.generateText(request);
    }

    // mode === 'auto': Try Ollama first, fail over to Gemini
    if (this.ollama.isAvailable()) {
      try {
        return await this.ollama.generateText(request);
      } catch (ollamaErr) {
        logger.warn('Auto mode: Ollama generateText failed, attempting failover to Gemini...', {
          error: ollamaErr instanceof Error ? ollamaErr.message : String(ollamaErr),
        });
        if (this.gemini.isAvailable()) {
          return await this.gemini.generateText(request);
        }
        throw ollamaErr;
      }
    }

    if (this.gemini.isAvailable()) {
      return await this.gemini.generateText(request);
    }

    throw new Error('No AI provider available (Ollama offline and Gemini unconfigured). Falling back to deterministic mode.');
  }

  public async generateStructured<T>(request: AICompletionRequest): Promise<AICompletionResponse<T>> {
    if (this.mode === 'ollama') {
      if (!this.ollama.isAvailable()) {
        throw new Error(
          `Configured AI Provider is "ollama", but local Ollama service is unavailable or model "${this.ollama.modelName}" is missing.`
        );
      }
      return await this.ollama.generateStructured<T>(request);
    }

    if (this.mode === 'gemini') {
      if (!this.gemini.isAvailable()) {
        throw new Error('Configured AI Provider is "gemini", but GEMINI_API_KEY is missing or invalid.');
      }
      return await this.gemini.generateStructured<T>(request);
    }

    // mode === 'auto': Try Ollama first, fail over to Gemini
    if (this.ollama.isAvailable()) {
      try {
        return await this.ollama.generateStructured<T>(request);
      } catch (ollamaErr) {
        logger.warn('Auto mode: Ollama generateStructured failed, failing over to Gemini...', {
          error: ollamaErr instanceof Error ? ollamaErr.message : String(ollamaErr),
        });
        if (this.gemini.isAvailable()) {
          return await this.gemini.generateStructured<T>(request);
        }
        throw ollamaErr;
      }
    }

    if (this.gemini.isAvailable()) {
      return await this.gemini.generateStructured<T>(request);
    }

    throw new Error('No AI provider available. Falling back to deterministic mode.');
  }
}

export const aiProviderManager = new AIProviderManager();
