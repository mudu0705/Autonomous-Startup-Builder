import type { ScoreCategory } from '../../../shared/types/score.ts';

export interface ScoringInput {
  analysisId: string;
  problemSeverityScore: number;
  marketSizeScore: number;
  competitiveMoatScore: number;
  unitEconomicsScore: number;
  teamExecutionScore: number;
  regulatoryRiskPenalty: number;
}

export interface DeterministicScoreResult {
  overallScore: number;
  verdict: 'high_potential' | 'viable_with_adjustments' | 'high_risk' | 'unviable';
  categories: ScoreCategory[];
  calculatedAt: string;
}
