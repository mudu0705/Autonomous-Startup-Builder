import type { FinancialParameters, FinancialProjectionResult } from './types.ts';
import type { ScenarioType } from '../../../shared/types/scenario.ts';

/**
 * Deterministic Financial Pro-Forma Engine Interface.
 * Calculates mathematical runway, burn rate, and unit economics without stochastic hallucination.
 */
export interface IFinanceEngine {
  generateProjection(
    parameters: FinancialParameters,
    scenario: ScenarioType
  ): FinancialProjectionResult;
}
