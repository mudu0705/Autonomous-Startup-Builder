export type ScenarioType = 'conservative' | 'moderate' | 'aggressive' | 'custom';

export interface FinancialMetric {
  month: number;
  revenue: number;
  expenses: number;
  burnRate: number;
  cashRunwayMonths: number;
}

export interface ScenarioAssumptionChanges {
  budgetINR?: number;
  monthlyOpExINR?: number;
  pricingINR?: number;
  expectedUsersMonth12?: number;
  targetCustomerAdjustment?: string;
  notes?: string;
}

export interface DimensionScoreDelta {
  dimension: string;
  originalScore: number;
  scenarioScore: number;
  delta: number;
  rationale: string;
}

export interface ScenarioComparison {
  scenarioId: string;
  analysisId: string;
  title: string;
  scenarioType: ScenarioType;
  assumptionsChanged: ScenarioAssumptionChanges;
  originalFinalScore: number;
  scenarioFinalScore: number;
  originalScoreBand: string;
  scenarioScoreBand: string;
  dimensionChanges: DimensionScoreDelta[];
  financialImpact: {
    originalRunwayMonths: number;
    scenarioRunwayMonths: number;
    originalBreakEvenMonth: number | null;
    scenarioBreakEvenMonth: number | null;
    originalTwelveMonthProfit: number;
    scenarioTwelveMonthProfit: number;
  };
  recommendations: string[];
  createdAt: string;
}

export interface Scenario {
  id: string;
  analysisId: string;
  type: ScenarioType;
  title: string;
  assumptions: string[];
  metrics: FinancialMetric[];
  projectedBreakEvenMonth?: number;
  comparison?: ScenarioComparison;
}

