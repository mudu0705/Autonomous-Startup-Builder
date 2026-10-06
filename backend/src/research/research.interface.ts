export interface ISearchResult {
  title: string;
  url?: string;
  domain?: string;
  snippet?: string;
  publisher?: string;
  publishedDate?: string;
  reliabilityScore?: number;
}

export interface IResearchProvider {
  readonly providerName: string;
  isAvailable(): boolean;
  search(query: string, options?: { maxResults?: number }): Promise<ISearchResult[]>;
}
