import { z } from 'zod';

export const SourceReferenceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  publisher: z.string().optional(),
  sourceType: z.enum(['academic', 'government', 'industry', 'news', 'company', 'estimate']).optional(),
  publishedDate: z.string().optional(),
  retrievedAt: z.string(),
  agentId: z.string(),
  claimSupported: z.string().optional(),
});

export const BaseAgentOutputSchema = z.object({
  agentId: z.string(),
  name: z.string(),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  executiveSummary: z.string(),
  keyFindings: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  sources: z.array(SourceReferenceSchema).default([]),
  limitations: z.array(z.string()).default([]),
  executionMode: z.enum(['live_gemini', 'deterministic_fallback']).optional(),
});

// Agent 1: Idea & Problem
export const IdeaProblemOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('idea_problem'),
  problemStatement: z.string(),
  rootCauses: z.array(z.string()).default([]),
  targetUsers: z.string(),
  painPoints: z.array(z.string()).default([]),
  currentAlternatives: z.array(z.string()).default([]),
  proposedSolution: z.string(),
  valueProposition: z.string(),
  problemSolutionFit: z.string(),
  improvementOpportunities: z.array(z.string()).default([]),
});

// Agent 2: Market Research
export const MarketResearchOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('market_research'),
  marketOverview: z.string(),
  marketSizeTAM: z.string().optional(),
  marketSizeSAM: z.string().optional(),
  marketSizeSOM: z.string().optional(),
  marketSizingMethodology: z.string().optional(),
  demandAssessment: z.string(),
  geographicRelevance: z.string(),
  majorTrends: z.array(z.string()).default([]),
  marketOpportunities: z.array(z.string()).default([]),
  marketBarriers: z.array(z.string()).default([]),
  researchDepth: z.enum(['quick', 'standard', 'deep']).default('standard'),
  isResearchAvailable: z.boolean().default(false),
});

// Agent 3: Competitor Analysis
export const CompetitorItemSchema = z.object({
  name: z.string(),
  type: z.enum(['direct', 'indirect', 'alternative']),
  description: z.string(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  pricing: z.string().optional(),
  marketShareEstimate: z.string().optional(),
});

export const FeatureComparisonItemSchema = z.object({
  feature: z.string(),
  proposedStartup: z.union([z.boolean(), z.string()]),
  competitors: z.record(z.string(), z.union([z.boolean(), z.string()])),
});

export const MarketGapAnalysisSchema = z.object({
  whatCompetitorsAreMissing: z.array(z.string()).default([]),
  whatCustomersAreMissing: z.array(z.string()).default([]),
  underservedSegments: z.array(z.string()).default([]),
  whitespace: z.array(z.string()).optional().default([]),
  whatStartupCanDoDifferently: z.array(z.string()).optional().default([]),
  whatStartupShouldNotCopy: z.array(z.string()).optional().default([]),
  differentiationOpportunities: z.array(z.string()).default([]),
  proposedAdvantage: z.string(),
});

export const CompetitorAnalysisOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('competitor_analysis'),
  directCompetitors: z.array(CompetitorItemSchema).default([]),
  indirectCompetitors: z.array(CompetitorItemSchema).default([]),
  alternatives: z.array(CompetitorItemSchema).default([]),
  featureComparisonMatrix: z.array(FeatureComparisonItemSchema).default([]),
  marketGapAnalysis: MarketGapAnalysisSchema,
});

// Agent 4: Customer & Validation
export const PersonaSchema = z.object({
  name: z.string(),
  role: z.string(),
  demographics: z.string(),
  coreNeeds: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
  motivations: z.array(z.string()).default([]),
  adoptionBarriers: z.array(z.string()).default([]),
  decisionFactors: z.array(z.string()).default([]),
});

export const ValidationHypothesisSchema = z.object({
  id: z.string(),
  hypothesis: z.string(),
  whyItMatters: z.string(),
  validationMethod: z.enum(['interview', 'survey', 'prototype_experiment', 'landing_page']),
  suggestedSampleSize: z.string(),
  successMetric: z.string(),
  expectedResult: z.string().optional().default(''),
  failureCondition: z.string().optional().default(''),
  risks: z.array(z.string()).default([]),
  recommendation: z.string(),
});

export const CustomerValidationOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('customer_validation'),
  primaryTargetCustomers: z.string(),
  secondaryTargetCustomers: z.string().optional(),
  personas: z.array(PersonaSchema).default([]),
  hypotheses: z.array(ValidationHypothesisSchema).default([]),
  interviewStrategy: z.array(z.string()).default([]),
  surveyStrategy: z.array(z.string()).default([]),
  prototypeExperiment: z.string(),
  landingPageExperiment: z.string().optional(),
});

// Agent 5: Business Model
export const RevenueStreamSchema = z.object({
  streamName: z.string(),
  pricingModel: z.string(),
  unitPriceEstimate: z.string().optional(),
  assumptions: z.string(),
});

export const ModelComparisonSchema = z.object({
  modelName: z.string(),
  suitability: z.enum(['recommended', 'alternative', 'not_recommended']),
  rationale: z.string(),
});

export const UnitEconomicsAssumptionsSchema = z.object({
  estimatedCAC: z.string().optional(),
  estimatedLTV: z.string().optional(),
  ltvCacRatio: z.string().optional(),
  paybackPeriodMonths: z.string().optional(),
  grossMarginPercent: z.number().optional(),
});

export const BusinessModelOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('business_model'),
  customerSegments: z.array(z.string()).default([]),
  valueProposition: z.string(),
  channels: z.array(z.string()).default([]),
  customerRelationships: z.array(z.string()).default([]),
  revenueStreams: z.array(RevenueStreamSchema).default([]),
  keyResources: z.array(z.string()).default([]),
  keyActivities: z.array(z.string()).default([]),
  keyPartners: z.array(z.string()).default([]),
  costStructure: z.array(z.string()).default([]),
  modelComparison: z.array(ModelComparisonSchema).default([]),
  unitEconomicsAssumptions: UnitEconomicsAssumptionsSchema,
});

// Agent 6: Finance & Budget
export const CostItemSchema = z.object({
  item: z.string(),
  amountINR: z.number(),
  category: z.string(),
});

export const FinancialScenarioSchema = z.object({
  scenario: z.enum(['conservative', 'expected', 'optimistic']),
  initialInvestmentINR: z.number(),
  monthlyOperatingCostINR: z.number(),
  expectedMonthlyRevenueINR: z.number(),
  runwayMonths: z.number(),
  breakEvenMonth: z.number().nullable(),
  twelveMonthRevenueINR: z.number(),
  twelveMonthExpensesINR: z.number(),
  twelveMonthProfitINR: z.number(),
});

export const BudgetAllocationSchema = z.object({
  category: z.string(),
  percentage: z.number(),
  amountINR: z.number(),
});

export const FinanceBudgetOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('finance_budget'),
  startingBudgetINR: z.number(),
  budgetSource: z.enum(['USER_PROVIDED', 'AI_ESTIMATED', 'ASSUMED']),
  budgetCertainty: z.boolean(),
  initialSetupCosts: z.array(CostItemSchema).default([]),
  monthlyOperatingCosts: z.array(CostItemSchema).default([]),
  scenarios: z.object({
    conservative: FinancialScenarioSchema,
    expected: FinancialScenarioSchema,
    optimistic: FinancialScenarioSchema,
  }),
  cashRunwayMonths: z.number(),
  breakEvenMonth: z.number().nullable(),
  budgetAllocationBreakdown: z.array(BudgetAllocationSchema).default([]),
  deterministicFormulasUsed: z.array(z.string()).default([]),
  financialRisks: z.array(z.string()).default([]),
});

// Agent 7: MVP / Product
export const MustHaveFeatureSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.literal('P0'),
  userValue: z.string(),
});

export const NiceToHaveFeatureSchema = z.object({
  name: z.string(),
  description: z.string(),
  priority: z.enum(['P1', 'P2']),
  userValue: z.string(),
});

export const FeatureToAvoidSchema = z.object({
  name: z.string(),
  reasonToAvoid: z.string(),
});

export const UserJourneyStepSchema = z.object({
  step: z.number(),
  userAction: z.string(),
  systemResponse: z.string(),
});

export const TechnicalArchitectureSchema = z.object({
  components: z.array(z.string()).default([]),
  suggestedTechStack: z.object({
    frontend: z.array(z.string()).default([]),
    backend: z.array(z.string()).default([]),
    database: z.array(z.string()).default([]),
    hostingInfrastructure: z.array(z.string()).default([]),
    keyLibraries: z.array(z.string()).default([]),
  }),
  integrations: z.array(z.string()).default([]),
  dataFlowSummary: z.string(),
});

export const MvpRoadmapSchema = z.object({
  mvpV1: z.array(z.string()).default([]),
  mvpV2Future: z.array(z.string()).default([]),
  estimatedSprintWeeks: z.number().default(6),
});

export const MvpProductOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('mvp_product'),
  mvpObjective: z.string(),
  mustHaveFeatures: z.array(MustHaveFeatureSchema).default([]),
  niceToHaveFeatures: z.array(NiceToHaveFeatureSchema).default([]),
  featuresToAvoidInitially: z.array(FeatureToAvoidSchema).default([]),
  userJourneySteps: z.array(UserJourneyStepSchema).default([]),
  technicalArchitecture: TechnicalArchitectureSchema,
  roadmap: MvpRoadmapSchema,
});

// Agent 8: Risk & Feasibility
export const RiskCategoryEnum = z.enum([
  'market',
  'customer',
  'technical',
  'financial',
  'operational',
  'competitive',
  'regulatory',
  'security',
  'scalability',
]);

export const RiskItemSchema = z.object({
  category: RiskCategoryEnum,
  risk: z.string(),
  likelihood: z.enum(['Low', 'Medium', 'High']),
  impact: z.enum(['Low', 'Medium', 'High']),
  severityScore: z.number().min(1).max(9),
  mitigation: z.string(),
});

export const FeasibilityScoresSchema = z.object({
  technicalFeasibility: z.number().min(0).max(100),
  marketFeasibility: z.number().min(0).max(100),
  financialFeasibility: z.number().min(0).max(100),
  operationalFeasibility: z.number().min(0).max(100),
  overallFeasibility: z.number().min(0).max(100),
});

export const RiskFeasibilityOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('risk_feasibility'),
  risks: z.array(RiskItemSchema).default([]),
  feasibilityScores: FeasibilityScoresSchema,
  feasibilityConclusion: z.string(),
  majorConcerns: z.array(z.string()).default([]),
});

// Agent 9: Strategy
export const AcquisitionChannelSchema = z.object({
  channel: z.string(),
  rationale: z.string(),
  costTier: z.enum(['Low', 'Medium', 'High']),
});

export const StrategyOutputSchema = BaseAgentOutputSchema.extend({
  agentId: z.literal('strategy'),
  positioningStatement: z.string(),
  differentiationStrategy: z.string(),
  goToMarketStrategy: z.string(),
  acquisitionChannels: z.array(AcquisitionChannelSchema).default([]),
  strategicPartnerships: z.array(z.string()).default([]),
  thirtyDayRoadmap: z.array(z.string()).default([]),
  sixtyDayRoadmap: z.array(z.string()).default([]),
  ninetyDayRoadmap: z.array(z.string()).default([]),
  pursuitDecision: z.enum(['Proceed', 'Proceed with changes', 'Validate first', 'High concerns']),
  decisionRationale: z.string(),
  criticalSuccessFactors: z.array(z.string()).default([]),
});
