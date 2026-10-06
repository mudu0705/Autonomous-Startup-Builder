export type ScoreBand =
  | 'Strong Potential'
  | 'Moderate / Promising Potential'
  | 'Needs Improvement'
  | 'High Concerns';

export type DecisionVerdict =
  | 'Proceed'
  | 'Proceed with changes'
  | 'Validate first'
  | 'High concerns';

export interface DimensionScore {
  dimension: string;
  agentId: string;
  score: number;
  confidence: number;
  weight: number; // 1/9 (equal)
  explanation: string;
  strengths: string[];
  weaknesses: string[];
}

export interface AIDecisionSummary {
  shouldPursue: string;
  why: string;
  supportingFactors: string[];
  biggestConcerns: string[];
  whatToValidateFirst: string[];
  whatToChange: string[];
  finalDecision: DecisionVerdict;
}

export interface StartupScore {
  id: string;
  analysisId: string;
  overallScore: number;
  scoreBand: ScoreBand;
  verdict: DecisionVerdict;
  dimensions: DimensionScore[];
  decisionSummary: AIDecisionSummary;
  disclaimer: string;
  calculatedAt: string;
}

