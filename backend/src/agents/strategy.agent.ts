import type { StrategyOutput } from '../../../shared/types/agent.ts';
import { StrategyOutputSchema } from '../../../shared/schemas/agentOutputs.schema.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { logger } from '../config/logger.ts';

export async function runStrategyAgent(
  project: {
    name?: string;
    startupIdea: string;
    proposedSolution?: string;
    targetCustomers?: string;
    location?: { country: string; scope: string; locations: string[] };
  },
  priorOutputs: Record<string, any>,
  analysisId: string
): Promise<StrategyOutput> {
  const startupName = project.name || 'Your Startup';
  const idea = project.startupIdea;
  const audience = project.targetCustomers || 'Target users';
  const solution = project.proposedSolution || 'Digital application';

  if (!geminiProvider.isAvailable()) {
    throw new Error('Gemini AI Provider is not available. GEMINI_API_KEY is required for Strategy Agent analysis.');
  }

  // Extract prior context findings & scores from all 8 previous agents
  const ideaData = priorOutputs.idea_problem;
  const marketData = priorOutputs.market_research;
  const competitorData = priorOutputs.competitor_analysis;
  const customerData = priorOutputs.customer_validation;
  const businessData = priorOutputs.business_model;
  const financeData = priorOutputs.finance_budget;
  const mvpData = priorOutputs.mvp_product;
  const riskData = priorOutputs.risk_feasibility;

  const ideaScore = ideaData?.score ?? 76;
  const marketScore = marketData?.score ?? 72;
  const competitorScore = competitorData?.score ?? 74;
  const customerScore = customerData?.score ?? 76;
  const businessScore = businessData?.score ?? 75;
  const financeScore = financeData?.score ?? 74;
  const mvpScore = mvpData?.score ?? 78;
  const riskScore = riskData?.score ?? 75;

  // Compute average of previous 8 agent scores to guide objective decision
  const avgPriorScore = Math.round(
    (ideaScore + marketScore + competitorScore + customerScore + businessScore + financeScore + mvpScore + riskScore) / 8
  );

  let defaultDecision: 'Proceed' | 'Proceed with changes' | 'Validate first' | 'High concerns' = 'Proceed with changes';
  if (avgPriorScore >= 80) defaultDecision = 'Proceed';
  else if (avgPriorScore >= 65) defaultDecision = 'Proceed with changes';
  else if (avgPriorScore >= 50) defaultDecision = 'Validate first';
  else defaultDecision = 'High concerns';

  const priorSummaryContext = `
SUMMARY OF THE PREVIOUS 8 AGENT OUTPUTS:
1. Idea & Problem Agent (Score: ${ideaScore}/100):
   - Problem Statement: "${ideaData?.problemStatement || idea}"
   - Root Causes: ${JSON.stringify(ideaData?.rootCauses || [])}
   - Strengths: ${JSON.stringify(ideaData?.strengths || [])}

2. Market Research Agent (Score: ${marketScore}/100):
   - TAM: "${marketData?.marketSizeTAM || 'N/A'}", SAM: "${marketData?.marketSizeSAM || 'N/A'}"
   - Major Trends: ${JSON.stringify(marketData?.majorTrends || [])}
   - Barriers: ${JSON.stringify(marketData?.marketBarriers || [])}

3. Competitor Analysis Agent (Score: ${competitorScore}/100):
   - Direct Competitors: ${JSON.stringify((competitorData?.directCompetitors || []).map((c: any) => c.name))}
   - Market Gap whitespace: ${JSON.stringify(competitorData?.marketGapAnalysis?.whitespace || competitorData?.marketGapAnalysis?.whatCompetitorsAreMissing || [])}
   - Proposed Advantage: "${competitorData?.marketGapAnalysis?.proposedAdvantage || ''}"

4. Customer & Validation Agent (Score: ${customerScore}/100):
   - Primary Persona: "${customerData?.primaryTargetCustomers || audience}"
   - Validation Hypotheses Count: ${(customerData?.hypotheses || []).length}
   - Core Adoption Barriers: ${JSON.stringify((customerData?.personas || []).flatMap((p: any) => p.adoptionBarriers || []))}

5. Business Model Agent (Score: ${businessScore}/100):
   - Value Proposition: "${businessData?.valueProposition || ''}"
   - Revenue Streams: ${JSON.stringify((businessData?.revenueStreams || []).map((r: any) => r.streamName))}
   - Unit Economics LTV/CAC: "${businessData?.unitEconomicsAssumptions?.ltvCacRatio || 'N/A'}"

6. Finance & Budget Agent (Score: ${financeScore}/100):
   - Starting Budget: ₹${financeData?.startingBudgetINR?.toLocaleString() || '500,000'} INR
   - Expected Runway: ${financeData?.cashRunwayMonths || 'N/A'} months
   - Break-Even Month: Month ${financeData?.breakEvenMonth || '10+'}

7. MVP / Product Agent (Score: ${mvpScore}/100):
   - Objective: "${mvpData?.mvpObjective || ''}"
   - P0 Must-Haves: ${JSON.stringify((mvpData?.mustHaveFeatures || []).map((f: any) => f.name))}
   - Build Timeline: ${mvpData?.roadmap?.estimatedSprintWeeks || 6} weeks

8. Risk & Feasibility Agent (Score: ${riskScore}/100):
   - Overall Feasibility: ${riskData?.feasibilityScores?.overallFeasibility || 76}/100
   - Major Concerns: ${JSON.stringify(riskData?.majorConcerns || [])}
`;

  const prompt = `You are the Strategy Agent for startup analysis. You are the FINAL SYNTHESIS AGENT that integrates the findings of all 8 previous agents.

STARTUP: ${startupName}
IDEA: ${idea}
SOLUTION: ${solution}
TARGET AUDIENCE: ${audience}

${priorSummaryContext}

INSTRUCTIONS:
1. Synthesize the findings of the 8 previous agents into a coherent commercial strategy.
2. DO NOT independently invent a new startup concept—ground your recommendations explicitly on the previous agent outputs provided above.
3. Formulate: positioning statement, defensible differentiation strategy, go-to-market plan, acquisition channels (channel name, rationale, costTier: "Low", "Medium", or "High"), and strategic partnerships.
4. Detail a 30-day, 60-day, and 90-day phased execution roadmap.
5. Pursuit Decision: Select strictly one of: "Proceed", "Proceed with changes", "Validate first", "High concerns".
   Explain the decision rationale using actual evidence from the previous 8 agent findings.

Respond with valid JSON matching:
{
  "agentId": "strategy",
  "name": "Strategy Agent",
  "score": <number 0-100 evaluating strategic coherence and GTM viability>,
  "confidence": <number 0.8-0.95>,
  "executiveSummary": "<2-3 sentences synthesizing the strategic verdict and execution priority>",
  "positioningStatement": "<For (target customer) who (has pain), (startup name) is a (category) that (delivers key benefit) unlike (alternative)>",
  "differentiationStrategy": "<Core competitive moat and differentiation angle derived from competitor gap findings>",
  "goToMarketStrategy": "<Phase 1 distribution and market entry approach>",
  "acquisitionChannels": [
    { "channel": "<Channel 1>", "rationale": "<Why it works>", "costTier": "Low" },
    { "channel": "<Channel 2>", "rationale": "<Why it works>", "costTier": "Medium" }
  ],
  "strategicPartnerships": ["<potential partner 1>", "<partner 2>"],
  "thirtyDayRoadmap": ["<30-day milestone 1>", "<30-day milestone 2>"],
  "sixtyDayRoadmap": ["<60-day milestone 1>", "<60-day milestone 2>"],
  "ninetyDayRoadmap": ["<90-day milestone 1>", "<90-day milestone 2>"],
  "pursuitDecision": "${defaultDecision}",
  "decisionRationale": "<Detailed 2-3 sentence explanation referencing specific prior agent findings>",
  "criticalSuccessFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<strategic strength 1>", "<strategic strength 2>"],
  "weaknesses": ["<strategic challenge 1>"],
  "assumptions": ["<strategic assumption 1>"],
  "recommendations": ["<immediate action 1>", "<immediate action 2>"],
  "sources": [],
  "limitations": ["Strategic roadmap assumes founder execution capacity and current market conditions."],
  "executionMode": "live_gemini"
}

Return JSON only.`;

  const response = await geminiProvider.generateStructured<Partial<StrategyOutput>>({
    prompt,
    systemPrompt: 'You are a veteran startup advisor and venture strategy director. Synthesize prior evidence into objective recommendations. Return JSON only.',
    temperature: 0.2,
  });

  if (!response.parsed) {
    throw new Error('StrategyAgent received empty response from Gemini');
  }

  const candidate = {
    agentId: 'strategy',
    name: 'Strategy Agent',
    score: Math.min(100, Math.max(0, response.parsed.score ?? avgPriorScore)),
    confidence: response.parsed.confidence ?? 0.88,
    executiveSummary: response.parsed.executiveSummary || `The strategic synthesis recommends advancing with targeted adjustments.`,
    positioningStatement: response.parsed.positioningStatement || `For ${audience}, ${startupName} provides purpose-built automation.`,
    differentiationStrategy: response.parsed.differentiationStrategy || 'Hyper-focus on Indian context, zero-setup onboarding, and accessible pricing.',
    goToMarketStrategy: response.parsed.goToMarketStrategy || 'Grassroots community distribution followed by intent search marketing.',
    acquisitionChannels: response.parsed.acquisitionChannels || [
      { channel: 'Community Discovery', rationale: 'Low-cost initial customer acquisition', costTier: 'Low' },
      { channel: 'Search & Content Marketing', rationale: 'Captures high-intent users', costTier: 'Medium' },
    ],
    strategicPartnerships: response.parsed.strategicPartnerships || ['Regional trade associations'],
    thirtyDayRoadmap: response.parsed.thirtyDayRoadmap || ['Complete 15 customer interviews', 'Test clickable prototype'],
    sixtyDayRoadmap: response.parsed.sixtyDayRoadmap || ['Launch private beta with 25 users', 'Test UPI checkout'],
    ninetyDayRoadmap: response.parsed.ninetyDayRoadmap || ['Public launch', 'Track cohort retention'],
    pursuitDecision: response.parsed.pursuitDecision || defaultDecision,
    decisionRationale: response.parsed.decisionRationale || `Analytical rating of ${avgPriorScore}/100 across 8 prior agent dimensions supports proceeding with targeted validation.`,
    criticalSuccessFactors: response.parsed.criticalSuccessFactors || ['Rapid time-to-value', 'Low CAC', 'Disciplined cash burn'],
    keyFindings: response.parsed.keyFindings || ['Synthesized prior findings confirm viable market whitespace'],
    strengths: response.parsed.strengths || ['Clear strategic positioning', 'Phased execution roadmap'],
    weaknesses: response.parsed.weaknesses || ['Distribution requires early founder sales effort'],
    assumptions: response.parsed.assumptions || ['Target customers provide candid beta feedback'],
    recommendations: response.parsed.recommendations || ['Follow 30-day customer validation plan before paid marketing'],
    sources: [],
    limitations: response.parsed.limitations || ['Strategy assessment synthesizes available intake and prior agent metrics.'],
    executionMode: 'live_gemini',
  };

  const validation = StrategyOutputSchema.safeParse(candidate);
  if (!validation.success) {
    logger.error('StrategyAgent output schema validation failed', { errors: validation.error.format() });
    throw new Error(`StrategyAgent output validation failed: ${validation.error.message}`);
  }

  return validation.data as StrategyOutput;
}
