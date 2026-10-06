import type { IResearchProvider, ISearchResult } from './research.interface.ts';
import { env } from '../config/env.ts';
import { logger } from '../config/logger.ts';

/**
 * Optional GitHub Public API Research Provider.
 * Discovers open-source competitors, reference implementations, and tech solutions.
 * Works without authentication using public rate limits, or with optional GITHUB_TOKEN.
 */
export class GitHubResearchProvider implements IResearchProvider {
  public readonly providerName = 'github-search';
  private token: string | null = null;

  constructor() {
    this.token = (env.GITHUB_TOKEN || process.env.GITHUB_TOKEN || '').trim() || null;
    if (this.token) {
      logger.info('GitHub Research Provider initialized with authenticated token');
    } else {
      logger.info('GitHub Research Provider initialized in public mode (no token)');
    }
  }

  public isAvailable(): boolean {
    return true; // Public GitHub API is always available unless rate-limited
  }

  public async search(query: string, options?: { maxResults?: number }): Promise<ISearchResult[]> {
    const maxResults = Math.min(options?.maxResults || 4, 10);
    const sanitizedQuery = query
      .replace(/[^\w\s-]/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join('+');

    if (!sanitizedQuery) {
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(sanitizedQuery)}&sort=stars&order=desc&per_page=${maxResults}`;

      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AutonomousStartupBuilder-Agent/1.0',
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn('GitHub Search API returned non-OK status', {
          status: response.status,
          statusText: response.statusText,
        });
        return [];
      }

      const data = (await response.json()) as {
        items?: Array<{
          name: string;
          full_name: string;
          html_url: string;
          description?: string;
          stargazers_count?: number;
          language?: string;
          updated_at?: string;
        }>;
      };

      if (!data.items || !Array.isArray(data.items)) {
        return [];
      }

      return data.items.map((repo) => ({
        title: `${repo.name} - Open Source Reference`,
        url: repo.html_url,
        domain: 'github.com',
        snippet: `Repository ${repo.full_name} (${repo.stargazers_count ?? 0} stars, ${repo.language || 'Code'}): ${repo.description || 'Open-source software implementation'}`,
        publisher: 'GitHub Open Source Ecosystem',
        publishedDate: repo.updated_at,
        reliabilityScore: 80,
      }));
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      logger.warn('GitHub Research search failed gracefully', {
        error: err instanceof Error ? err.message : 'Unknown error',
        query,
      });
      return [];
    }
  }
}

export const gitHubResearchProvider = new GitHubResearchProvider();
