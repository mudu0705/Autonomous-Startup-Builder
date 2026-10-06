import type { ScoringInput, DeterministicScoreResult } from './types.ts';

/**
 * Deterministic Scoring Engine Interface.
 * Enforces reproducible, explainable scoring criteria based on mathematical rubrics.
 */
export interface IScoringEngine {
  calculateScore(input: ScoringInput): DeterministicScoreResult;
  getWeightDistribution(): Record<string, number>;
}
