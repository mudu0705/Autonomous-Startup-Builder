export interface ReportSection {
  number: number;
  title: string;
  agentId?: string;
  summary: string;
  content: string | Record<string, unknown> | unknown[];
  keyFindings?: string[];
  recommendations?: string[];
}

export interface StartupBlueprint {
  id: string;
  analysisId: string;
  projectId: string;
  startupName: string;
  generatedAt: string;
  overallScore: number;
  scoreBand: string;
  decisionVerdict: string;
  sections: ReportSection[];
  disclaimer: string;
  pdfExportUrl?: string;
}

export interface ExecutiveReport {
  id: string;
  analysisId: string;
  title: string;
  executiveSummary: string;
  sections: ReportSection[];
  blueprint: StartupBlueprint;
  generatedAt: string;
  pdfUrl?: string;
}

