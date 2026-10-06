import type { FinanceBudgetOutput } from '../../../shared/types/agent.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { FinanceCalculationEngine } from '../services/finance.engine.ts';
import { logger } from '../config/logger.ts';

export async function runFinanceBudgetAgent(
  project: {
    name?: string;
    startupIdea: string;
    proposedSolution?: string;
    targetCustomers?: string;
    budget?: {
      amount: number | null;
      currency: string;
      source: string | null;
      isCertain: boolean;
    };
    location?: { country: string; scope: string; locations: string[] };
  },
  analysisId: string
): Promise<FinanceBudgetOutput> {
  const startupName = project.name || 'Your Startup';
  const idea = project.startupIdea;
  const userBudgetAmount = project.budget?.amount || null;
  const isAiEstimated = !userBudgetAmount || project.budget?.source === 'AI_ESTIMATED';

  // Determine starting budget baseline in INR
  const baselineBudgetINR = userBudgetAmount && userBudgetAmount > 0
    ? userBudgetAmount
    : 500000; // Sensible default estimate: ₹5 Lakhs if user chose AI Estimated

  // Baseline cost distributions for early Indian software startups
  let initialSetupCost = Math.round(baselineBudgetINR * 0.25); // Setup, legal, branding, tooling (approx 25%)
  let monthlyOpEx = Math.round((baselineBudgetINR - initialSetupCost) / 7); // Aim for 6-8 month default runway
  if (monthlyOpEx < 25000) monthlyOpEx = 25000; // Floor at ₹25k/mo
  let baseExpectedMonthlyRev = Math.round(monthlyOpEx * 0.7); // Month 1 target

  // If Gemini is available, refine qualitative cost categories and breakdown
  let qualitativeFindings: string[] = [];
  let qualitativeRisks: string[] = [];
  let qualitativeRecs: string[] = [];

  if (geminiProvider.isAvailable()) {
    try {
      const prompt = `You are the Finance & Budget Agent for a startup evaluation platform.
Evaluate this startup's capital requirements in INR.
Note: You provide domain assumptions; the deterministic calculation engine computes all arithmetic.

STARTUP: ${startupName}
IDEA: ${idea}
CAPITAL BUDGET IN INR: ₹${baselineBudgetINR.toLocaleString()} (${isAiEstimated ? 'AI Estimated' : 'User Provided'})
PROPOSED SOLUTION: ${project.proposedSolution || 'Digital application'}

INSTRUCTIONS:
1. Provide realistic breakdown categories for setup costs and monthly operating expenses in India.
2. Outline key financial risks (cash burn, payment gateway fees, server scaling).
3. Recommend 2 capital allocation optimization strategies.

Respond with valid JSON:
{
  "score": <number 0-100 indicating financial feasibility and runway health>,
  "confidence": <number 0.75-0.9>,
  "executiveSummary": "<2 sentences summarizing capital efficiency, runway length, and break-even feasibility>",
  "initialCostItems": [
    { "item": "Company Incorporation & Legal Compliance", "amountINR": ${Math.round(initialSetupCost * 0.25)}, "category": "Legal" },
    { "item": "Brand Identity, Domain & Workspace Tools", "amountINR": ${Math.round(initialSetupCost * 0.25)}, "category": "Brand & Tools" },
    { "item": "Initial UI/UX & Architecture Assets", "amountINR": ${Math.round(initialSetupCost * 0.5)}, "category": "Product Development" }
  ],
  "monthlyOpExItems": [
    { "item": "Cloud Compute, Database & Hosting", "amountINR": ${Math.round(monthlyOpEx * 0.25)}, "category": "Infrastructure" },
    { "item": "Customer Acquisition & Search Testing", "amountINR": ${Math.round(monthlyOpEx * 0.45)}, "category": "Marketing" },
    { "item": "Software Licenses, API & Domain Tools", "amountINR": ${Math.round(monthlyOpEx * 0.3)}, "category": "Software & Tools" }
  ],
  "financialRisks": [
    "High early customer acquisition costs eroding runway prematurely",
    "Delayed conversion from free trial to paid recurring tiers"
  ],
  "recommendations": [
    "Preserve at least 6 months of operating runway before taking on full-time overhead",
    "Leverage founder-led sales to keep initial CAC near zero for first 50 customers"
  ]
}

Return JSON only.`;

      const response = await geminiProvider.generateStructured<{
        score?: number;
        confidence?: number;
        executiveSummary?: string;
        initialCostItems?: Array<{ item: string; amountINR: number; category: string }>;
        monthlyOpExItems?: Array<{ item: string; amountINR: number; category: string }>;
        financialRisks?: string[];
        recommendations?: string[];
      }>({
        prompt,
        systemPrompt: 'You are an Indian venture finance specialist. Provide realistic early-stage startup cost modeling. Return JSON only.',
        temperature: 0.1,
      });

      if (response.parsed) {
        if (response.parsed.financialRisks) qualitativeRisks = response.parsed.financialRisks;
        if (response.parsed.recommendations) qualitativeRecs = response.parsed.recommendations;
        if (response.parsed.initialCostItems && response.parsed.initialCostItems.length > 0) {
          const sum = response.parsed.initialCostItems.reduce((acc, i) => acc + (i.amountINR || 0), 0);
          if (sum > 0 && sum < baselineBudgetINR) initialSetupCost = sum;
        }
        if (response.parsed.monthlyOpExItems && response.parsed.monthlyOpExItems.length > 0) {
          const sum = response.parsed.monthlyOpExItems.reduce((acc, i) => acc + (i.amountINR || 0), 0);
          if (sum > 0) monthlyOpEx = sum;
        }
      }
    } catch (err) {
      logger.warn('FinanceBudgetAgent Gemini call failed, utilizing baseline assumptions', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Strictly compute arithmetic via the Deterministic Engine
  const scenarios = FinanceCalculationEngine.generateScenarios(
    baselineBudgetINR,
    initialSetupCost,
    monthlyOpEx,
    baseExpectedMonthlyRev
  );

  const budgetAllocationBreakdown = [
    { category: 'Product Development & Engineering Tools', percentage: 40, amountINR: Math.round(baselineBudgetINR * 0.4) },
    { category: 'Customer Acquisition & Growth Testing', percentage: 30, amountINR: Math.round(baselineBudgetINR * 0.3) },
    { category: 'Cloud Infrastructure & Database APIs', percentage: 15, amountINR: Math.round(baselineBudgetINR * 0.15) },
    { category: 'Legal, Compliance & Working Capital Reserve', percentage: 15, amountINR: Math.round(baselineBudgetINR * 0.15) },
  ];

  const deterministicScore = Math.min(
    100,
    Math.max(40, Math.round(55 + Math.min(30, scenarios.expected.runwayMonths * 3.5)))
  );

  return {
    agentId: 'finance_budget',
    name: 'Finance & Budget Agent',
    score: deterministicScore,
    confidence: 0.88,
    executiveSummary: `With an initial capital base of ₹${baselineBudgetINR.toLocaleString()} INR, the expected scenario provides approximately ${scenarios.expected.runwayMonths} months of operating runway. Break-even is realistically modeled around month ${scenarios.expected.breakEvenMonth || '10+'}.`,
    startingBudgetINR: baselineBudgetINR,
    budgetSource: isAiEstimated ? 'AI_ESTIMATED' : 'USER_PROVIDED',
    budgetCertainty: !isAiEstimated,
    initialSetupCosts: [
      { item: 'Company Incorporation & Professional Compliance', amountINR: Math.round(initialSetupCost * 0.25), category: 'Legal & Accounting' },
      { item: 'Branding, Domain, SSL & Workspace Tooling', amountINR: Math.round(initialSetupCost * 0.25), category: 'Tools & Identity' },
      { item: 'Initial UI/UX Assets & Development Toolchain', amountINR: Math.round(initialSetupCost * 0.5), category: 'Product' },
    ],
    monthlyOperatingCosts: [
      { item: 'Cloud Compute, Managed DB & Edge Network', amountINR: Math.round(monthlyOpEx * 0.25), category: 'Infrastructure' },
      { item: 'Targeted Customer Acquisition & Ad Experiments', amountINR: Math.round(monthlyOpEx * 0.45), category: 'Growth & Marketing' },
      { item: 'Software Licenses, Messaging & Support API', amountINR: Math.round(monthlyOpEx * 0.3), category: 'Operational SaaS' },
    ],
    scenarios,
    cashRunwayMonths: scenarios.expected.runwayMonths,
    breakEvenMonth: scenarios.expected.breakEvenMonth,
    budgetAllocationBreakdown,
    deterministicFormulasUsed: [
      'Cash Runway = (Starting Budget - Initial Setup) / (Monthly OpEx - Monthly Revenue)',
      '12-Month Cash Balance = Previous Balance + Monthly Net Income',
      'Break-Even = First month where Net Income (Revenue - Expenses) >= 0',
      'All scenario arithmetic generated via server-side deterministic finance engine (zero LLM calculation)',
    ],
    financialRisks: qualitativeRisks.length > 0
      ? qualitativeRisks
      : [
          'High early customer acquisition costs can compress runway if conversion lags',
          'Subscription churn in the first 90 days requires aggressive onboarding support',
        ],
    keyFindings: [
      `Initial capital allocation of ₹${baselineBudgetINR.toLocaleString()} is sufficient for MVP release and initial pilot cohort testing`,
      `Maintaining monthly operating expenditures under ₹${monthlyOpEx.toLocaleString()} preserves a healthy runway buffer`,
    ],
    strengths: [
      'Lean software development cost structure minimizes heavy fixed asset investments',
      'Clear visibility into unit unit economic levers and variable growth expenses',
    ],
    weaknesses: [
      'Limited capital buffer requires strict milestone-driven spending before scaling paid ads',
    ],
    assumptions: [
      'Operating costs reflect typical Indian tech startup benchmarks without expensive full-time agency retainers',
      'Revenue projections assume 15% month-over-month growth following public launch',
    ],
    recommendations: qualitativeRecs.length > 0
      ? qualitativeRecs
      : [
          'Reserve at least 15% of initial capital as an emergency buffer for unexpected infrastructure or compliance needs',
          'Prioritize organic channels and referral loops to maintain low blended CAC during months 1 through 6',
        ],
    sources: [],
    limitations: ['Projections are modeled scenario estimates. Founder must track actual monthly cash burn in real time.'],
  };
}
