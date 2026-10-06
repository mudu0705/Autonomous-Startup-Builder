import type { IResearchProvider, ISearchResult } from './research.interface.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';

/**
 * Google Search / Grounding Research Provider.
 * Connects to external search APIs when configured.
 * Strictly adheres to honesty principles: NEVER fabricates URLs, sources, or search results when unavailable.
 */
export class GoogleResearchProvider implements IResearchProvider {
  public readonly providerName = 'google-search';
  private apiKey: string | null = null;
  private searchEngineId: string | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_SEARCH_API_KEY || null;
    this.searchEngineId = process.env.GOOGLE_SEARCH_CX || null;
    if (this.apiKey && this.searchEngineId) {
      logger.info('Google Research Provider initialized with active search credentials');
    } else {
      logger.info('Google Research Provider initialized in fallback/offline mode (live search unavailable)');
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.searchEngineId);
  }

  public async search(query: string, options?: { maxResults?: number }): Promise<ISearchResult[]> {
    if (!this.isAvailable()) {
      logger.debug('Search requested but research provider is not configured. Returning empty results.', { query });
      return [];
    }

    const maxResults = options?.maxResults || 5;
    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', this.apiKey!);
      url.searchParams.set('cx', this.searchEngineId!);
      url.searchParams.set('q', query);
      url.searchParams.set('num', String(Math.min(maxResults, 10)));

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        logger.warn('Google Search API request failed', { status: response.status, statusText: response.statusText });
        return [];
      }

      const data = await response.json() as {
        items?: Array<{
          title?: string;
          link?: string;
          displayLink?: string;
          snippet?: string;
        }>;
      };

      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }

      return data.items.map((item) => ({
        title: item.title || 'Untitled Source',
        url: item.link,
        domain: item.displayLink,
        snippet: item.snippet,
        publisher: item.displayLink || 'Web Search',
        reliabilityScore: 85,
      }));
    } catch (err) {
      logger.warn('Google Search Provider encountered an error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        query,
      });
      return [];
    }
  }
}

export const googleResearchProvider = new GoogleResearchProvider();
