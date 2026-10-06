export interface ResearchQuery {
  topic: string;
  industry?: string;
  keywords: string[];
  maxResults?: number;
}

export interface ResearchSourceItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  publishedDate?: string;
  reliabilityScore: number;
}

export interface ResearchResult {
  query: string;
  sources: ResearchSourceItem[];
  retrievedAt: string;
}
