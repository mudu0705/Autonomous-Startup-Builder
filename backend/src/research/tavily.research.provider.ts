import type { IResearchProvider, ISearchResult } from './research.interface.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';

/**
 * Tavily Search / Grounding Research Provider.
 * Connects to Tavily API for live web research.
 * Strictly adheres to honesty principles: NEVER fabricates URLs, sources, or search results when unavailable.
 */
export class TavilyResearchProvider implements IResearchProvider {
  public readonly providerName = 'tavily-search';
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = env.TAVILY_API_KEY || process.env.TAVILY_API_KEY || null;
    if (this.apiKey) {
      logger.info('Tavily Research Provider initialized with active search credentials');
    } else {
      logger.info('Tavily Research Provider initialized in fallback/offline mode (live search unavailable)');
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  public async search(query: string, options?: { maxResults?: number }): Promise<ISearchResult[]> {
    if (!this.isAvailable()) {
      logger.debug('Search requested but research provider is not configured. Returning empty results.', { query });
      return [];
    }

    const maxResults = options?.maxResults || 5;
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: query,
          search_depth: 'advanced', // Can be 'basic' or 'advanced'
          max_results: Math.min(maxResults, 10),
          include_answer: false,
          include_images: false,
          include_raw_content: false,
          include_domains: [],
          exclude_domains: [],
        }),
      });

      if (!response.ok) {
        logger.warn('Tavily Search API request failed', { status: response.status, statusText: response.statusText });
        return [];
      }

      const data = await response.json() as {
        results?: Array<{
          title: string;
          url: string;
          content: string;
          score: number;
          published_date?: string;
        }>;
      };

      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((item) => {
        let domain = 'Web Search';
        try {
          if (item.url) {
            domain = new URL(item.url).hostname;
          }
        } catch (e) {
          // ignore invalid url
        }

        return {
          title: item.title || 'Untitled Source',
          url: item.url,
          domain: domain,
          snippet: item.content,
          publisher: domain,
          reliabilityScore: item.score ? Math.round(item.score * 100) : 85,
          publishedDate: item.published_date,
        };
      });
    } catch (err) {
      logger.warn('Tavily Search Provider encountered an error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        query,
      });
      return [];
    }
  }
}

export const tavilyResearchProvider = new TavilyResearchProvider();
