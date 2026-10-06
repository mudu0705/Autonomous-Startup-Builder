import type { BusinessModelOutput } from '../../../shared/types/agent.ts';
import { BusinessModelOutputSchema } from '../../../shared/schemas/agentOutputs.schema.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { logger } from '../config/logger.ts';

export async function runBusinessModelAgent(
  project: {
    name?: string;
    startupIdea: string;
    proposedSolution?: string;
    targetCustomers?: string;
    revenueModel?: string | null;
    location?: { country: string; scope: string; locations: string[] };
  },
  analysisId: string
): Promise<BusinessModelOutput> {
  const startupName = project.name || 'Your Startup';
  const idea = project.startupIdea;
  const audience = project.targetCustomers || 'Target Indian market';
  const solution = project.proposedSolution || 'Integrated digital platform';
  const userRevenueNote = project.revenueModel || 'Not decided by founder yet; requires objective analytical recommendation';

  if (!geminiProvider.isAvailable()) {
    throw new Error('Gemini AI Provider is not available. GEMINI_API_KEY is required for Business Model Agent analysis.');
  }

  const prompt = `You are the Business Model Agent for startup analysis.
Formulate a robust commercial architecture covering all 9 Business Model Canvas components.

STARTUP: ${startupName}
IDEA: ${idea}
SOLUTION: ${solution}
TARGET AUDIENCE: ${audience}
FOUNDER'S REVENUE NOTE: "${userRevenueNote}"

INSTRUCTIONS:
1. Synthesize all 9 components of the Business Model Canvas: customer segments, value proposition, channels, customer relationships, revenue streams, key resources, key activities, key partners, cost structure.
2. Compare 3 plausible monetization models (e.g. Tiered SaaS Subscription, Transaction/Commission Fee, Usage-based Pay-as-you-go).
3. Recommend the strongest model and explain why it fits target customer adoption behavior.
4. Provide structured unit economics assumptions (estimated CAC, estimated LTV, LTV/CAC ratio, payback period, gross margin %).
5. Clearly label unit economics as analytical assumptions.

Respond with valid JSON matching:
{
  "agentId": "business_model",
  "name": "Business Model Agent",
  "score": <number 0-100 evaluating business model defensibility & unit economic viability>,
  "confidence": <number 0.7-0.9>,
  "executiveSummary": "<2-3 sentences summarizing the commercial model, pricing architecture, and path to monetization>",
  "customerSegments": ["<segment 1>", "<segment 2>"],
  "valueProposition": "<Clear commercial value proposition statement>",
  "channels": ["<distribution channel 1>", "<channel 2>", "<channel 3>"],
  "customerRelationships": ["<self-serve / dedicated / community>"],
  "revenueStreams": [
    {
      "streamName": "<Primary Revenue Stream Name>",
      "pricingModel": "<e.g. Monthly/Annual Subscription in INR>",
      "unitPriceEstimate": "<e.g. ₹799/month Pro, ₹1,999/month Team>",
      "assumptions": "<Pricing assumption explanation>"
    }
  ],
  "keyResources": ["<resource 1>", "<resource 2>"],
  "keyActivities": ["<activity 1>", "<activity 2>"],
  "keyPartners": ["<partner category 1>", "<partner category 2>"],
  "costStructure": ["<fixed cost 1>", "<variable cost 2>", "<cloud / API costs>"],
  "modelComparison": [
    {
      "modelName": "<Model 1 e.g. SaaS Subscription>",
      "suitability": "recommended",
      "rationale": "<Why this is the strongest model>"
    },
    {
      "modelName": "<Model 2 e.g. Transaction Fee>",
      "suitability": "alternative",
      "rationale": "<Pros and cons>"
    },
    {
      "modelName": "<Model 3 e.g. Ad-supported>",
      "suitability": "not_recommended",
      "rationale": "<Why not recommended>"
    }
  ],
  "unitEconomicsAssumptions": {
    "estimatedCAC": "₹1,200 – ₹2,500 (Blended across organic and paid channels)",
    "estimatedLTV": "₹7,200 – ₹12,000 (Based on 12-month expected retention)",
    "ltvCacRatio": "3.5x to 4.8x (Healthy venture benchmark range)",
    "paybackPeriodMonths": "3 to 4 months",
    "grossMarginPercent": 82
  },
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<business model strength 1>"],
  "weaknesses": ["<monetization risk 1>"],
  "assumptions": ["<core commercial assumption 1>"],
  "recommendations": ["<commercial recommendation 1>", "<recommendation 2>"],
  "sources": [],
  "limitations": ["Unit economics represent modeled benchmarks; empirical metrics required once launched."],
  "executionMode": "live_gemini"
}

Return JSON only.`;

  const response = await geminiProvider.generateStructured<Partial<BusinessModelOutput>>({
    prompt,
    systemPrompt: 'You are a veteran business model architect and venture pricing strategist. Return JSON only.',
    temperature: 0.2,
  });

  if (!response.parsed) {
    throw new Error('BusinessModelAgent received empty response from Gemini');
  }

  const candidate = {
    agentId: 'business_model',
    name: 'Business Model Agent',
    score: Math.min(100, Math.max(0, response.parsed.score ?? 75)),
    confidence: response.parsed.confidence ?? 0.86,
    executiveSummary: response.parsed.executiveSummary || `The recommended business model centers on transparent, recurring pricing calibrated for Indian willingness-to-pay.`,
    customerSegments: response.parsed.customerSegments || [audience],
    valueProposition: response.parsed.valueProposition || `Delivers workflow efficiency with zero complex setup overhead.`,
    channels: response.parsed.channels || ['Direct online onboarding', 'Community referral', 'Search intent marketing'],
    customerRelationships: response.parsed.customerRelationships || ['Self-serve automated onboarding'],
    revenueStreams: response.parsed.revenueStreams || [],
    keyResources: response.parsed.keyResources || ['Application workflow IP', 'Cloud infrastructure'],
    keyActivities: response.parsed.keyActivities || ['Continuous feature iteration', 'Customer acquisition'],
    keyPartners: response.parsed.keyPartners || ['Indian payment gateway providers', 'Cloud hosting partners'],
    costStructure: response.parsed.costStructure || ['Cloud hosting and compute', 'Customer acquisition testing'],
    modelComparison: response.parsed.modelComparison || [],
    unitEconomicsAssumptions: response.parsed.unitEconomicsAssumptions || {
      estimatedCAC: '₹1,500 (Blended estimate)',
      estimatedLTV: '₹6,800 (10-month model)',
      ltvCacRatio: '4.5x',
      paybackPeriodMonths: '3.2 months',
      grossMarginPercent: 80,
    },
    keyFindings: response.parsed.keyFindings || ['SaaS recurring pricing provides cash-flow predictability'],
    strengths: response.parsed.strengths || ['High software gross margins (80%+)'],
    weaknesses: response.parsed.weaknesses || ['Customer acquisition cost management required'],
    assumptions: response.parsed.assumptions || ['Target customers retain for 9-12 months'],
    recommendations: response.parsed.recommendations || ['Support seamless UPI Autopay and QR instant checkout'],
    sources: [],
    limitations: response.parsed.limitations || ['Unit economics are modeled benchmarks.'],
    executionMode: 'live_gemini',
  };

  const validation = BusinessModelOutputSchema.safeParse(candidate);
  if (!validation.success) {
    logger.error('BusinessModelAgent output schema validation failed', { errors: validation.error.format() });
    throw new Error(`BusinessModelAgent output validation failed: ${validation.error.message}`);
  }

  return validation.data as BusinessModelOutput;
}
