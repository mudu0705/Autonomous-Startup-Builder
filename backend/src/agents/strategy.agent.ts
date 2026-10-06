import type { StrategyOutput } from '../../../shared/types/agent.ts';
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

  // Extract prior context highlights
  const ideaScore = priorOutputs.idea_problem?.score ?? 76;
  const marketScore = priorOutputs.market_research?.score ?? 72;
  const competitorScore = priorOutputs.competitor_analysis?.score ?? 74;
  const customerScore = priorOutputs.customer_validation?.score ?? 76;
  const businessScore = priorOutputs.business_model?.score ?? 75;
  const financeScore = priorOutputs.finance_budget?.score ?? 74;
  const mvpScore = priorOutputs.mvp_product?.score ?? 78;
  const riskScore = priorOutputs.risk_feasibility?.score ?? 75;

  // Average prior scores to guide objective decision
  const avgPriorScore = Math.round(
    (ideaScore + marketScore + competitorScore + customerScore + businessScore + financeScore + mvpScore + riskScore) / 8
  );

  let defaultDecision: 'Proceed' | 'Proceed with changes' | 'Validate first' | 'High concerns' = 'Proceed with changes';
  if (avgPriorScore >= 80) defaultDecision = 'Proceed';
  else if (avgPriorScore >= 65) defaultDecision = 'Proceed with changes';
  else if (avgPriorScore >= 50) defaultDecision = 'Validate first';
  else defaultDecision = 'High concerns';

  if (geminiProvider.isAvailable()) {
    try {
      const prompt = `You are the Strategy Agent for startup analysis. You are the synthesis agent that integrates all prior 8 agent assessments.

STARTUP: ${startupName}
IDEA: ${idea}
SOLUTION: ${solution}
TARGET AUDIENCE: ${audience}

SUMMARY OF PREVIOUS AGENT ASSESSMENTS:
- Idea & Problem Score: ${ideaScore}/100
- Market Research Score: ${marketScore}/100
- Competitor Analysis Score: ${competitorScore}/100
- Customer & Validation Score: ${customerScore}/100
- Business Model Score: ${businessScore}/100
- Finance & Budget Score: ${financeScore}/100
- MVP & Product Score: ${mvpScore}/100
- Risk & Feasibility Score: ${riskScore}/100

INSTRUCTIONS:
1. Synthesize a coherent commercial strategy: positioning statement, defensible differentiation, go-to-market plan, acquisition channels, and strategic partnerships.
2. Outline an actionable 30-day, 60-day, and 90-day execution roadmap.
3. Answer: "Should this startup be pursued?"
   Choose strictly one of: "Proceed", "Proceed with changes", "Validate first", "High concerns".
   Provide an objective, non-guaranteed justification based on the prior analysis data.

Respond with valid JSON:
{
  "score": <number 0-100 evaluating strategic coherence and GTM viability>,
  "confidence": <number 0.8-0.95>,
  "executiveSummary": "<2-3 sentences synthesizing the strategic verdict and execution priority>",
  "positioningStatement": "<For (target customer) who (has pain), (startup name) is a (category) that (delivers key benefit) unlike (alternative)>",
  "differentiationStrategy": "<Core competitive moat and differentiation angle>",
  "goToMarketStrategy": "<Phase 1 distribution and market entry approach>",
  "acquisitionChannels": [
    { "channel": "<Channel 1>", "rationale": "<Why it works>", "costTier": "Low" },
    { "channel": "<Channel 2>", "rationale": "<Why it works>", "costTier": "Medium" }
  ],
  "strategicPartnerships": ["<potential ecosystem partner 1>", "<partner 2>"],
  "thirtyDayRoadmap": ["<Week 1-2 objective>", "<Week 3-4 objective>"],
  "sixtyDayRoadmap": ["<Month 2 objective 1>", "<Month 2 objective 2>"],
  "ninetyDayRoadmap": ["<Month 3 objective 1>", "<Month 3 objective 2>"],
  "pursuitDecision": "${defaultDecision}",
  "decisionRationale": "<Detailed 2-3 sentence explanation of the pursuit decision>",
  "criticalSuccessFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<strategic strength 1>", "<strategic strength 2>"],
  "weaknesses": ["<strategic challenge 1>"],
  "assumptions": ["<strategic assumption 1>"],
  "recommendations": ["<immediate action 1>", "<immediate action 2>"],
  "limitations": ["Strategic roadmap assumes founder execution capacity and current market conditions."]
}

Return JSON only.`;

      const response = await geminiProvider.generateStructured<Partial<StrategyOutput>>({
        prompt,
        systemPrompt: 'You are a veteran startup advisor and venture strategy director. Synthesize prior evidence into objective recommendations. Return JSON only.',
        temperature: 0.2,
      });

      if (response.parsed && response.parsed.pursuitDecision) {
        return {
          agentId: 'strategy',
          name: 'Strategy Agent',
          score: Math.min(100, Math.max(0, response.parsed.score ?? avgPriorScore)),
          confidence: response.parsed.confidence ?? 0.88,
          executiveSummary: response.parsed.executiveSummary || `The strategic synthesis recommends advancing with targeted adjustments, prioritizing customer problem validation before scaling marketing investments.`,
          positioningStatement: response.parsed.positioningStatement || `For ${audience} struggling with manual inefficiency, ${startupName} provides purpose-built automation that delivers immediate operational relief.`,
          differentiationStrategy: response.parsed.differentiationStrategy || 'Hyper-focus on Indian context, seamless zero-setup onboarding, and accessible micro-pricing.',
          goToMarketStrategy: response.parsed.goToMarketStrategy || 'Community-led grassroots distribution followed by targeted search intent marketing and referral loops.',
          acquisitionChannels: response.parsed.acquisitionChannels || [
            { channel: 'Founder-led Community Discovery', rationale: 'Zero-cost high-trust initial customer acquisition', costTier: 'Low' },
            { channel: 'Targeted Search & Content Marketing', rationale: 'Captures high-intent users actively searching for solutions', costTier: 'Medium' },
          ],
          strategicPartnerships: response.parsed.strategicPartnerships || ['Regional trade/student associations', 'Complementary ecosystem service providers'],
          thirtyDayRoadmap: response.parsed.thirtyDayRoadmap || [
            'Complete 15 problem-discovery interviews with target users',
            'Deploy interactive clickable prototype to test usability',
            'Finalize MVP P0 technical scope and database schemas',
          ],
          sixtyDayRoadmap: response.parsed.sixtyDayRoadmap || [
            'Launch private beta with first 25 pilot users',
            'Gather daily feedback, eliminate onboarding bottlenecks',
            'Activate UPI payment gateway and test willingness to pay',
          ],
          ninetyDayRoadmap: response.parsed.ninetyDayRoadmap || [
            'Public release on product directories and community channels',
            'Implement referral sharing loops and measure 30-day retention',
            'Review cash burn and evaluate expansion roadmap',
          ],
          pursuitDecision: response.parsed.pursuitDecision,
          decisionRationale: response.parsed.decisionRationale || `The core concept demonstrates viable fundamentals with healthy unit economic potential, provided early validation milestones are met.`,
          criticalSuccessFactors: response.parsed.criticalSuccessFactors || [
            'Rapid time-to-value during initial 3 minutes of onboarding',
            'Maintaining low customer acquisition cost via organic channels',
            'Disciplined monthly operating cash flow management',
          ],
          keyFindings: response.parsed.keyFindings || ['Strongest opportunity lies in specialized execution rather than trying to compete horizontally with legacy platforms', 'Milestone-based stage gating protects founder capital'],
          strengths: response.parsed.strengths || ['Clear strategic positioning against complex incumbents', 'Actionable, phased 90-day execution roadmap'],
          weaknesses: response.parsed.weaknesses || ['Requires active distribution hustle from the founder in the early weeks'],
          assumptions: response.parsed.assumptions || ['Early adopters are willing to provide candid product feedback during the beta period'],
          recommendations: response.parsed.recommendations || ['Follow the 30-day customer validation plan before spending on paid ads', 'Set up automated retention telemetry from day one'],
          sources: [],
          limitations: ['Strategy recommendations provide analytical guidance; no commercial outcome is guaranteed.'],
        };
      }
    } catch (err) {
      logger.warn('StrategyAgent Gemini call failed, utilizing deterministic strategy synthesis', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Deterministic fallback grounded strictly in user intake & prior agent outputs
  return {
    agentId: 'strategy',
    name: 'Strategy Agent',
    score: avgPriorScore,
    confidence: 0.87,
    executiveSummary: `Strategic evaluation indicates a viable venture opportunity. The recommended path is "${defaultDecision}": proceed with focused adjustments, prioritizing direct customer validation before expanding product scope.`,
    positioningStatement: `For ${audience} who experience friction with "${idea}", "${startupName}" is a purpose-built platform that streamlines daily operations at a fraction of legacy complexity.`,
    differentiationStrategy: 'Superior regional localization, rapid zero-friction onboarding, and transparent accessible pricing tailored for the Indian market.',
    goToMarketStrategy: 'Grassroots community distribution and founder-led outreach to seed the first 50 power users, followed by search intent content and viral referral loops.',
    acquisitionChannels: [
      {
        channel: 'Community Discovery & Direct Outreach',
        rationale: 'Engage target users in existing discussion forums, WhatsApp groups, and trade associations at near-zero acquisition cost.',
        costTier: 'Low',
      },
      {
        channel: 'Content Marketing & SEO',
        rationale: 'Publish practical guides addressing specific daily bottlenecks to capture high-intent organic search traffic.',
        costTier: 'Low',
      },
      {
        channel: 'Targeted Intent Digital Ads (LinkedIn / Meta)',
        rationale: 'Deploy small-scale paid campaigns once organic conversion metrics are verified.',
        costTier: 'Medium',
      },
    ],
    strategicPartnerships: [
      'Regional industry associations and incubator networks for verified member distribution',
      'Ecosystem SaaS and payment providers for co-marketing opportunities',
    ],
    thirtyDayRoadmap: [
      'Days 1–10: Execute 15 customer discovery interviews using The Mom Test framework',
      'Days 11–20: Build and test interactive clickable prototype with 8 target users',
      'Days 21–30: Finalize P0 feature specification and initiate backend database schemas',
    ],
    sixtyDayRoadmap: [
      'Days 31–45: Complete core engineering of the MVP workflow loop',
      'Days 46–60: Onboard initial cohort of 25 beta users under close observation and refine usability',
    ],
    ninetyDayRoadmap: [
      'Days 61–75: Activate production payment gateway and measure paid conversion rate',
      'Days 76–90: Launch public release, track cohort retention, and assess cash runway',
    ],
    pursuitDecision: defaultDecision,
    decisionRationale: `With an aggregated analytical rating of ${avgPriorScore}/100 across 8 core venture dimensions, the venture possesses sound market logic. Focusing initial efforts on customer validation ensures capital is deployed effectively.`,
    criticalSuccessFactors: [
      'Delivering unmistakable user value within the first 3 minutes of initial login',
      'Disciplined operational expenditure to preserve at least 6 months of cash runway',
      'Continuous user feedback integration during the first 90 days',
    ],
    keyFindings: [
      'The highest strategic priority is proving customer willingness to pay early',
      'Avoiding premature feature complexity keeps engineering velocity high',
    ],
    strengths: [
      'Clear differentiation against bloated legacy alternatives',
      'Actionable milestone-driven roadmap minimizing capital risk',
    ],
    weaknesses: [
      'Distribution momentum depends heavily on founder sales effort in early phases',
    ],
    assumptions: [
      'Target customers will adopt digital workflows when demonstrated time savings exceed 1 hour per day',
    ],
    recommendations: [
      'Do not write extensive backend code until Hypothesis 1 is validated with 15 customer interviews',
      'Maintain weekly scorecards tracking active user retention and feedback',
    ],
    sources: [],
    limitations: ['Strategy assessment synthesizes available intake and prior agent metrics. No financial return is guaranteed.'],
  };
}
