import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { OllamaProvider, ollamaProvider, extractAndParseJson, OllamaJsonParseError } from '../src/ai/ollama.provider.ts';
import { AIProviderManager, aiProviderManager } from '../src/ai/provider.manager.ts';
import { GeminiProvider } from '../src/ai/gemini.provider.ts';
import { runIdeaProblemAgent } from '../src/agents/ideaProblem.agent.ts';

describe('Ollama AI Provider & Provider Manager Test Suite', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // =========================================================================
  // 1. Ollama Provider Initialization
  // =========================================================================
  test('1. Ollama provider initialization with default and custom options', () => {
    const defaultProvider = new OllamaProvider();
    assert.equal(defaultProvider.providerName, 'ollama');
    assert.equal(defaultProvider.modelName, 'qwen2.5-coder:7b');

    const customProvider = new OllamaProvider({
      baseUrl: 'http://localhost:11435/',
      model: 'mistral:latest',
      timeoutMs: 60000,
    });
    assert.equal(customProvider.modelName, 'mistral:latest');
  });

  // =========================================================================
  // 2. Ollama Unavailable (Endpoint Down)
  // =========================================================================
  test('2. Ollama unavailable when endpoint cannot be reached', async () => {
    globalThis.fetch = async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
    };

    const provider = new OllamaProvider();
    const available = await provider.checkAvailability();
    assert.equal(available, false);
    assert.equal(provider.isAvailable(), false);
  });

  // =========================================================================
  // 3. Ollama Model Unavailable
  // =========================================================================
  test('3. Ollama model unavailable when configured model is not pulled', async () => {
    globalThis.fetch = async (url: any) => {
      if (String(url).includes('/api/tags')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: [
              { name: 'llama3:8b' },
              { name: 'phi3:mini' },
            ],
          }),
        } as any;
      }
      throw new Error('Unexpected URL');
    };

    const provider = new OllamaProvider({ model: 'qwen2.5-coder:7b' });
    const available = await provider.checkAvailability();
    assert.equal(available, false, 'Should be false when qwen2.5-coder:7b is missing');
    assert.deepEqual(provider.getCachedModels(), ['llama3:8b', 'phi3:mini']);
  });

  // =========================================================================
  // 4. Ollama Successful Text Generation
  // =========================================================================
  test('4. Ollama successful text generation', async () => {
    globalThis.fetch = async (url: any, init: any) => {
      if (String(url).includes('/api/generate')) {
        const body = JSON.parse(init.body);
        assert.equal(body.model, 'qwen2.5-coder:7b');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: 'qwen2.5-coder:7b',
            response: 'Here is a comprehensive market analysis.',
            done: true,
            done_reason: 'stop',
            prompt_eval_count: 15,
            eval_count: 45,
          }),
        } as any;
      }
      throw new Error('Unexpected URL');
    };

    const provider = new OllamaProvider();
    const result = await provider.generateText({
      prompt: 'Analyze startup feasibility',
      temperature: 0.5,
    });

    assert.equal(result.text, 'Here is a comprehensive market analysis.');
    assert.equal(result.usage?.promptTokens, 15);
    assert.equal(result.usage?.completionTokens, 45);
    assert.equal(result.usage?.totalTokens, 60);
    assert.equal(result.finishReason, 'stop');
  });

  // =========================================================================
  // 5. Ollama Successful Structured JSON Generation
  // =========================================================================
  test('5. Ollama successful JSON generation and markdown code fence stripping', async () => {
    // Test direct JSON
    globalThis.fetch = async (url: any, init: any) => {
      const body = JSON.parse(init.body);
      assert.equal(body.format, 'json');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          model: 'qwen2.5-coder:7b',
          response: '```json\n{"score": 85, "title": "B2B SaaS"}\n```',
          done: true,
          prompt_eval_count: 20,
          eval_count: 30,
        }),
      } as any;
    };

    const provider = new OllamaProvider();
    const result = await provider.generateStructured<{ score: number; title: string }>({
      prompt: 'Evaluate B2B SaaS',
    });

    assert.equal(result.parsed?.score, 85);
    assert.equal(result.parsed?.title, 'B2B SaaS');

    // Test JSON extraction utility directly on raw text with noise
    const parsedDirty = extractAndParseJson<{ ok: boolean }>(
      'Here is the response you asked for:\n{"ok": true}\nHope that helps!'
    );
    assert.equal(parsedDirty.ok, true);
  });

  // =========================================================================
  // 6. Malformed JSON Response and Recovery / Failure
  // =========================================================================
  test('6. Malformed JSON response retries with repair instruction and throws controlled error if unrecoverable', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          response: 'This is not valid json at all { unclosed',
        }),
      } as any;
    };

    const provider = new OllamaProvider();

    await assert.rejects(
      async () => {
        await provider.generateStructured({ prompt: 'Invalid JSON test' });
      },
      (err: any) => {
        assert(err instanceof OllamaJsonParseError || err.message.includes('Failed to parse JSON'));
        return true;
      }
    );

    // Assert that retry was attempted once (total 2 calls)
    assert.equal(callCount, 2, 'Provider should have retried once upon encountering malformed JSON');
  });

  // =========================================================================
  // 7. Request Timeout with AbortController
  // =========================================================================
  test('7. Request timeout aborts request cleanly', async () => {
    globalThis.fetch = async (_url: any, init: any) => {
      return new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    const provider = new OllamaProvider({ timeoutMs: 50 });

    await assert.rejects(
      async () => {
        await provider.generateText({ prompt: 'Slow request' });
      },
      (err: any) => {
        assert(err.message.includes('timed out') || err.name === 'AbortError');
        return true;
      }
    );
  });

  // =========================================================================
  // 8. Provider Manager Selection
  // =========================================================================
  test('8. Provider manager selection obeys AI_PROVIDER mode configuration', () => {
    const mockOllama = new OllamaProvider();
    mockOllama.setAvailability(true);

    const mockGemini = new GeminiProvider();

    const manager = new AIProviderManager({
      ollama: mockOllama,
      gemini: mockGemini,
      mode: 'ollama',
    });

    assert.equal(manager.getMode(), 'ollama');
    assert.equal(manager.providerName, 'ollama');

    // Switch to gemini
    manager.setMode('gemini');
    assert.equal(manager.getMode(), 'gemini');

    // Switch to auto
    manager.setMode('auto');
    assert.equal(manager.getMode(), 'auto');
    // When ollama is available, auto prioritizes ollama
    assert.equal(manager.providerName, 'ollama');
  });

  // =========================================================================
  // 9. Auto Fallback Strategy
  // =========================================================================
  test('9. Auto mode falls back to Gemini or deterministic error when Ollama fails', async () => {
    const mockOllama = new OllamaProvider();
    mockOllama.setAvailability(false); // Ollama is offline

    const manager = new AIProviderManager({
      ollama: mockOllama,
      mode: 'auto',
    });

    assert.equal(manager.getActiveProvider(), null);

    // In ollama-only mode, failure throws without silent fallback to Gemini
    const ollamaOnlyManager = new AIProviderManager({
      ollama: mockOllama,
      mode: 'ollama',
    });

    await assert.rejects(
      async () => {
        await ollamaOnlyManager.generateText({ prompt: 'test' });
      },
      (err: any) => {
        assert(err.message.includes('Configured AI Provider is "ollama", but local Ollama service is unavailable'));
        return true;
      }
    );
  });

  // =========================================================================
  // 10. Existing Analysis Pipeline Integration
  // =========================================================================
  test('10. IdeaProblemAgent runs successfully with mock Ollama structured generation', async () => {
    globalThis.fetch = async (url: any) => {
      if (String(url).includes('/api/tags')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: [{ name: 'qwen2.5-coder:7b' }],
          }),
        } as any;
      }

      if (String(url).includes('/api/generate')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: 'qwen2.5-coder:7b',
            response: JSON.stringify({
              score: 82,
              confidence: 0.9,
              executiveSummary: 'Strong market opportunity with localized problem validation.',
              problemStatement: 'High transaction overhead for tier-2 Indian logistics operators.',
              rootCauses: ['Fragmented paper tracking', 'Lack of UPI reconciliation'],
              targetUsers: 'Logistics small operators in Maharashtra',
              painPoints: ['Reconciliation delay', 'Cash shrinkage'],
              currentAlternatives: ['Manual notebooks'],
              proposedSolution: 'Automated UPI payment and booking ledger',
              valueProposition: 'Saves 4 hours daily with automated reconciliation',
              problemSolutionFit: 'Strong fit',
              keyFindings: ['Urgent need', 'High willingness to adopt'],
              strengths: ['Low switching cost'],
              weaknesses: ['Requires field onboarding'],
              assumptions: ['Smartphone access'],
              recommendations: ['Conduct 15 driver interviews'],
              improvementOpportunities: ['Voice input support'],
              limitations: ['Preliminary assessment'],
            }),
          }),
        } as any;
      }
      throw new Error(`Unexpected URL ${url}`);
    };

    // Run agent with mock Ollama available
    ollamaProvider.setAvailability(true);
    const output = await runIdeaProblemAgent(
      {
        name: 'QuickLogistics India',
        startupIdea: 'Automated UPI payment and booking ledger for fleet operators',
        proposedSolution: 'Lightweight mobile web app with instant QR settlement',
        targetCustomers: 'Fleet operators in Maharashtra',
        location: { country: 'India', scope: 'state', locations: ['Maharashtra'] },
      },
      'mock-analysis-123'
    );

    assert.equal(output.agentId, 'idea_problem');
    assert.equal(output.score, 82);
    assert.equal(output.problemStatement, 'High transaction overhead for tier-2 Indian logistics operators.');
    assert.equal(output.executionMode, 'live_ollama');
    assert.equal(output.provider, 'ollama');
    assert.equal(output.model, 'qwen2.5-coder:7b');
  });
});
