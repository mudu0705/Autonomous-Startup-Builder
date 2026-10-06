import mongoose from 'mongoose';
import { SourceModel, ISourceDocument } from '../models/Source.ts';
import type { IResearchProvider, ISearchResult } from './research.interface.ts';
import { tavilyResearchProvider } from './tavily.research.provider.ts';
import type { SourceReference, AgentId } from '../../../shared/types/agent.ts';
import { logger } from '../config/logger.ts';

export class ResearchService {
  private provider: IResearchProvider;

  constructor(provider: IResearchProvider = tavilyResearchProvider) {
    this.provider = provider;
  }

  public setProvider(provider: IResearchProvider): void {
    this.provider = provider;
  }

  public isAvailable(): boolean {
    return this.provider.isAvailable();
  }

  /**
   * Executes research query for an agent and persists verified sources to MongoDB.
   */
  public async research(
    analysisId: string,
    agentId: AgentId,
    query: string,
    claimSupported?: string
  ): Promise<SourceReference[]> {
    if (!this.provider.isAvailable()) {
      return [];
    }

    try {
      const results: ISearchResult[] = await this.provider.search(query, { maxResults: 4 });
      if (results.length === 0) {
        return [];
      }

      const sourceRefs: SourceReference[] = [];

      for (const res of results) {
        if (!res.title || !res.url) continue;

        const doc = await SourceModel.create({
          analysisId: new mongoose.Types.ObjectId(analysisId),
          agentId,
          title: res.title,
          url: res.url,
          domain: res.domain || new URL(res.url).hostname,
          snippet: res.snippet || '',
          reliabilityScore: res.reliabilityScore || 80,
          publishedDate: res.publishedDate,
          retrievedAt: new Date(),
        });

        sourceRefs.push({
          title: doc.title,
          url: doc.url,
          publisher: doc.domain || 'External Web Source',
          sourceType: 'industry',
          publishedDate: doc.publishedDate,
          retrievedAt: doc.retrievedAt.toISOString(),
          agentId,
          claimSupported,
        });
      }

      logger.info('Research completed for agent', { agentId, query, count: sourceRefs.length });
      return sourceRefs;
    } catch (err) {
      logger.warn('Research service encountered an error during search', {
        agentId,
        query,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Retrieves all verified sources associated with an analysis from database.
   */
  public async getSourcesForAnalysis(analysisId: string): Promise<SourceReference[]> {
    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      return [];
    }

    const docs = await SourceModel.find({
      analysisId: new mongoose.Types.ObjectId(analysisId),
    }).sort({ retrievedAt: -1 }).lean();

    return docs.map((doc: any) => ({
      title: doc.title,
      url: doc.url,
      publisher: doc.domain || 'External Source',
      sourceType: 'industry',
      publishedDate: doc.publishedDate,
      retrievedAt: doc.retrievedAt instanceof Date ? doc.retrievedAt.toISOString() : String(doc.retrievedAt),
      agentId: doc.agentId as AgentId,
    }));
  }
}

export const researchService = new ResearchService();
