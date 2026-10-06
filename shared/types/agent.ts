export type AgentId =
  | 'idea_problem'
  | 'market_research'
  | 'competitor_analysis'
  | 'customer_validation'
  | 'business_model'
  | 'finance_budget'
  | 'mvp_product'
  | 'risk_feasibility'
  | 'strategy';

export type AgentExecutionStatus =
  | 'pending'
  | 'running'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface SourceReference {
  title: string;
  url?: string;
  publisher?: string;
  sourceType?: 'academic' | 'government' | 'industry' | 'news' | 'company' | 'estimate';
  publishedDate?: string;
  retrievedAt: string;
  agentId: AgentId;
  claimSupported?: string;
}

export interface BaseAgentOutput {
  agentId: AgentId;
  name: string;
  score: number; // 0 - 100
  confidence: number; // 0 - 1
  executiveSummary: string;
  keyFindings: string[];
  strengths: string[];
  weaknesses: string[];
  assumptions: string[];
  recommendations: string[];
  sources: SourceReference[];
  limitations: string[];
}

export interface IdeaProblemOutput extends BaseAgentOutput {
  agentId: 'idea_problem';
  problemStatement: string;
  rootCauses: string[];
  targetUsers: string;
  painPoints: string[];
  currentAlternatives: string[];
  proposedSolution: string;
  valueProposition: string;
  problemSolutionFit: string;
  improvementOpportunities: string[];
}

export interface MarketResearchOutput extends BaseAgentOutput {
  agentId: 'market_research';
  marketOverview: string;
  marketSizeTAM?: string;
  marketSizeSAM?: string;
  marketSizeSOM?: string;
  marketSizingMethodology?: string;
  demandAssessment: string;
  geographicRelevance: string;
  majorTrends: string[];
  marketOpportunities: string[];
  marketBarriers: string[];
  researchDepth: 'quick' | 'standard' | 'deep';
  isResearchAvailable: boolean;
}

export interface CompetitorItem {
  name: string;
  type: 'direct' | 'indirect' | 'alternative';
  description: string;
  strengths: string[];
  weaknesses: string[];
  pricing?: string;
  marketShareEstimate?: string;
}

export interface CompetitorAnalysisOutput extends BaseAgentOutput {
  agentId: 'competitor_analysis';
  directCompetitors: CompetitorItem[];
  indirectCompetitors: CompetitorItem[];
  alternatives: CompetitorItem[];
  featureComparisonMatrix: Array<{
    feature: string;
    proposedStartup: boolean | string;
    competitors: Record<string, boolean | string>;
  }>;
  marketGapAnalysis: {
    whatCompetitorsAreMissing: string[];
    whatCustomersAreMissing: string[];
    underservedSegments: string[];
    differentiationOpportunities: string[];
    proposedAdvantage: string;
  };
}

export interface ValidationHypothesis {
  id: string;
  hypothesis: string;
  whyItMatters: string;
  validationMethod: 'interview' | 'survey' | 'prototype_experiment' | 'landing_page';
  suggestedSampleSize: string;
  successMetric: string;
  expectedResult: string;
  risks: string[];
  recommendation: string;
}

export interface CustomerValidationOutput extends BaseAgentOutput {
  agentId: 'customer_validation';
  primaryTargetCustomers: string;
  secondaryTargetCustomers?: string;
  personas: Array<{
    name: string;
    role: string;
    demographics: string;
    coreNeeds: string[];
    painPoints: string[];
    motivations: string[];
    adoptionBarriers: string[];
    decisionFactors: string[];
  }>;
  hypotheses: ValidationHypothesis[];
  interviewStrategy: string[];
  surveyStrategy: string[];
  prototypeExperiment: string;
  landingPageExperiment?: string;
}

export interface BusinessModelOutput extends BaseAgentOutput {
  agentId: 'business_model';
  customerSegments: string[];
  valueProposition: string;
  channels: string[];
  customerRelationships: string[];
  revenueStreams: Array<{
    streamName: string;
    pricingModel: string;
    unitPriceEstimate?: string;
    assumptions: string;
  }>;
  keyResources: string[];
  keyActivities: string[];
  keyPartners: string[];
  costStructure: string[];
  modelComparison: Array<{
    modelName: string;
    suitability: 'recommended' | 'alternative' | 'not_recommended';
    rationale: string;
  }>;
  unitEconomicsAssumptions: {
    estimatedCAC?: string;
    estimatedLTV?: string;
    ltvCacRatio?: string;
    paybackPeriodMonths?: string;
    grossMarginPercent?: number;
  };
}

export interface FinancialMetricYear {
  month: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  cashRemaining: number;
  burnRate: number;
}

export interface FinancialScenario {
  scenario: 'conservative' | 'expected' | 'optimistic';
  initialInvestmentINR: number;
  monthlyOperatingCostINR: number;
  expectedMonthlyRevenueINR: number;
  runwayMonths: number;
  breakEvenMonth: number | null; // null if does not break even in 12 months
  twelveMonthRevenueINR: number;
  twelveMonthExpensesINR: number;
  twelveMonthProfitINR: number;
}

export interface FinanceBudgetOutput extends BaseAgentOutput {
  agentId: 'finance_budget';
  startingBudgetINR: number;
  budgetSource: 'USER_PROVIDED' | 'AI_ESTIMATED' | 'ASSUMED';
  budgetCertainty: boolean;
  initialSetupCosts: Array<{ item: string; amountINR: number; category: string }>;
  monthlyOperatingCosts: Array<{ item: string; amountINR: number; category: string }>;
  scenarios: {
    conservative: FinancialScenario;
    expected: FinancialScenario;
    optimistic: FinancialScenario;
  };
  cashRunwayMonths: number;
  breakEvenMonth: number | null;
  budgetAllocationBreakdown: Array<{ category: string; percentage: number; amountINR: number }>;
  deterministicFormulasUsed: string[];
  financialRisks: string[];
}

export interface MvpProductOutput extends BaseAgentOutput {
  agentId: 'mvp_product';
  mvpObjective: string;
  mustHaveFeatures: Array<{ name: string; description: string; priority: 'P0'; userValue: string }>;
  niceToHaveFeatures: Array<{ name: string; description: string; priority: 'P1' | 'P2'; userValue: string }>;
  featuresToAvoidInitially: Array<{ name: string; reasonToAvoid: string }>;
  userJourneySteps: Array<{ step: number; userAction: string; systemResponse: string }>;
  technicalArchitecture: {
    components: string[];
    suggestedTechStack: {
      frontend: string[];
      backend: string[];
      database: string[];
      hostingInfrastructure: string[];
      keyLibraries: string[];
    };
    integrations: string[];
    dataFlowSummary: string;
  };
  roadmap: {
    mvpV1: string[];
    mvpV2Future: string[];
    estimatedSprintWeeks: number;
  };
}

export interface RiskItem {
  category: 'market' | 'customer' | 'technical' | 'financial' | 'operational' | 'competitive' | 'regulatory' | 'security' | 'scalability';
  risk: string;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  severityScore: number; // 1 - 9
  mitigation: string;
}

export interface RiskFeasibilityOutput extends BaseAgentOutput {
  agentId: 'risk_feasibility';
  risks: RiskItem[];
  feasibilityScores: {
    technicalFeasibility: number; // 0 - 100
    marketFeasibility: number;
    financialFeasibility: number;
    operationalFeasibility: number;
    overallFeasibility: number;
  };
  feasibilityConclusion: string;
  majorConcerns: string[];
}

export interface StrategyOutput extends BaseAgentOutput {
  agentId: 'strategy';
  positioningStatement: string;
  differentiationStrategy: string;
  goToMarketStrategy: string;
  acquisitionChannels: Array<{ channel: string; rationale: string; costTier: 'Low' | 'Medium' | 'High' }>;
  strategicPartnerships: string[];
  thirtyDayRoadmap: string[];
  sixtyDayRoadmap: string[];
  ninetyDayRoadmap: string[];
  pursuitDecision: 'Proceed' | 'Proceed with changes' | 'Validate first' | 'High concerns';
  decisionRationale: string;
  criticalSuccessFactors: string[];
}

export interface AgentRun {
  id: string;
  analysisId: string;
  agentId: AgentId;
  status: AgentExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
  durationMs?: number;
  outputPayload?: BaseAgentOutput;
}

export interface AnalysisResults {
  analysisId: string;
  projectId: string;
  version: number;
  completedAt: string;
  durationMs: number;
  agents: {
    idea_problem?: IdeaProblemOutput;
    market_research?: MarketResearchOutput;
    competitor_analysis?: CompetitorAnalysisOutput;
    customer_validation?: CustomerValidationOutput;
    business_model?: BusinessModelOutput;
    finance_budget?: FinanceBudgetOutput;
    mvp_product?: MvpProductOutput;
    risk_feasibility?: RiskFeasibilityOutput;
    strategy?: StrategyOutput;
  };
  overallScore: number;
  scoreBand: string;
  decisionVerdict: string;
  validationHypotheses: ValidationHypothesis[];
  topRecommendations: string[];
  strengths: string[];
  weaknesses: string[];
  allSources: SourceReference[];
}

