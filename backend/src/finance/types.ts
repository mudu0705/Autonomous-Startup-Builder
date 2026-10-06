import type { ScenarioType, FinancialMetric } from '../../../shared/types/scenario.ts';

export interface FinancialParameters {
  initialCapital: number;
  monthlyFixedCosts: number;
  customerAcquisitionCost: number;
  averageRevenuePerUser: number;
  initialCustomerCount: number;
  monthlyGrowthRate: number;
  churnRate: number;
  monthsToProject: number;
}

export interface FinancialProjectionResult {
  scenarioType: ScenarioType;
  metrics: FinancialMetric[];
  totalRevenue24m: number;
  totalExpenses24m: number;
  projectedBreakEvenMonth?: number;
  minimumCashBalance: number;
}
