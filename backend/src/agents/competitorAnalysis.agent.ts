import type { CompetitorAnalysisOutput, SourceReference } from '../../../shared/types/agent.ts';
import { CompetitorAnalysisOutputSchema } from '../../../shared/schemas/agentOutputs.schema.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { researchService } from '../research/research.service.ts';
import { logger } from '../config/logger.ts';

export async function runCompetitorAnalysisAgent(
  project: {
    name?: string;
    startupIdea: string;
    proposedSolution?: string;
    targetCustomers?: string;
    location?: { country: string; scope: string; locations: string[] };
  },
  analysisId: string
): Promise<CompetitorAnalysisOutput> {
  const startupName = project.name || 'Your Startup';
  const idea = project.startupIdea;
  const audience = project.targetCustomers || 'Indian market';

  if (!geminiProvider.isAvailable()) {
    throw new Error('Gemini AI Provider is not available. GEMINI_API_KEY is required for Competitor Analysis Agent analysis.');
  }

  let verifiedSources: SourceReference[] = [];
  if (researchService.isAvailable()) {
    try {
      verifiedSources = await researchService.research(
        analysisId,
        'competitor_analysis',
        `competitors alternatives ${idea} India`,
        'Indian competitor landscape and market gaps'
      );
    } catch (err) {
      logger.warn('Competitor research search query failed', { error: err });
    }
  }

  const prompt = `You are the Competitor Analysis Agent for a startup evaluation platform.
Analyze the competitive landscape and construct a rigorous COMPETITOR COMPARISON MATRIX and a detailed MARKET GAP ANALYSIS.

STARTUP NAME: ${startupName}
STARTUP IDEA: ${idea}
PROPOSED SOLUTION: ${project.proposedSolution || 'Automated digital platform'}
TARGET CUSTOMERS: ${audience}

INSTRUCTIONS:
1. Identify REAL direct competitors, indirect competitors, and existing manual status-quo alternatives in India/globally.
2. If real established company names exist in India or globally (e.g. Zoho, Khatabook, Notion, Canva, Practo, depending on domain), reference them accurately.
3. Build a feature comparison matrix highlighting the proposed startup versus market incumbents.
4. Perform an explicit MARKET GAP ANALYSIS addressing:
   - What competitors are missing
   - What customer needs remain underserved
   - Where the market whitespace is
   - What this startup can do differently
   - What the startup should NOT copy from incumbents
   - Differentiation opportunities & proposed startup advantage
5. DO NOT invent fake company names or fake pricing URLs.

Respond with valid JSON matching:
{
  "agentId": "competitor_analysis",
  "name": "Competitor Analysis Agent",
  "score": <number 0-100 indicating competitive opportunity & differentiation defensibility>,
  "confidence": <number 0.7-0.9>,
  "executiveSummary": "<2-3 sentences summarizing competitive intensity and primary market whitespace>",
  "directCompetitors": [
    {
      "name": "<Real direct competitor name>",
      "type": "direct",
      "description": "<What they do>",
      "strengths": ["<strength 1>", "<strength 2>"],
      "weaknesses": ["<weakness 1>", "<weakness 2>"],
      "pricing": "<Verifiable pricing or 'Contact for pricing'>",
      "marketShareEstimate": "<Incumbent / Growing / Niche>"
    }
  ],
  "indirectCompetitors": [
    {
      "name": "<Indirect competitor or broad platform>",
      "type": "indirect",
      "description": "<How they solve part of the problem>",
      "strengths": ["<strength 1>"],
      "weaknesses": ["<weakness 1>"]
    }
  ],
  "alternatives": [
    {
      "name": "Manual Spreadsheets & Informal Workarounds",
      "type": "alternative",
      "description": "Default status-quo methods users employ today",
      "strengths": ["Zero software cost", "Familiarity"],
      "weaknesses": ["High error rate", "Zero automation", "Time consuming"]
    }
  ],
  "featureComparisonMatrix": [
    {
      "feature": "<Core capability 1>",
      "proposedStartup": true,
      "competitors": { "Incumbent A": false, "Incumbent B": true }
    },
    {
      "feature": "<India-localized pricing / UPI>",
      "proposedStartup": true,
      "competitors": { "Incumbent A": false, "Incumbent B": false }
    }
  ],
  "marketGapAnalysis": {
    "whatCompetitorsAreMissing": ["<gap 1>", "<gap 2>"],
    "whatCustomersAreMissing": ["<unmet need 1>", "<unmet need 2>"],
    "underservedSegments": ["<segment 1>", "<segment 2>"],
    "whitespace": ["<whitespace opportunity 1>", "<whitespace opportunity 2>"],
    "whatStartupCanDoDifferently": ["<differentiation action 1>", "<differentiation action 2>"],
    "whatStartupShouldNotCopy": ["<feature/habit to NOT copy 1>", "<mistake to avoid 2>"],
    "differentiationOpportunities": ["<opportunity 1>", "<opportunity 2>"],
    "proposedAdvantage": "<Clear 1-sentence statement of unique competitive edge>"
  },
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<competitive strength 1>", "<competitive strength 2>"],
  "weaknesses": ["<competitive vulnerability 1>", "<competitive vulnerability 2>"],
  "assumptions": ["<competitor assumption 1>"],
  "recommendations": ["<positioning recommendation 1>", "<positioning recommendation 2>"],
  "sources": [],
  "limitations": ["<noted limitation>"],
  "executionMode": "live_gemini"
}

Return JSON only.`;

  const response = await geminiProvider.generateStructured<Partial<CompetitorAnalysisOutput>>({
    prompt,
    systemPrompt: 'You are a veteran competitive intelligence analyst specializing in Indian and global tech markets. Return JSON only.',
    temperature: 0.2,
  });

  if (!response.parsed) {
    throw new Error('CompetitorAnalysisAgent received empty response from Gemini');
  }

  const candidate = {
    agentId: 'competitor_analysis',
    name: 'Competitor Analysis Agent',
    score: Math.min(100, Math.max(0, response.parsed.score ?? 75)),
    confidence: response.parsed.confidence ?? 0.86,
    executiveSummary: response.parsed.executiveSummary || `The competitive landscape shows established generalist players, but significant whitespace remains for specialized solutions tailored to ${audience}.`,
    directCompetitors: response.parsed.directCompetitors || [],
    indirectCompetitors: response.parsed.indirectCompetitors || [],
    alternatives: response.parsed.alternatives || [],
    featureComparisonMatrix: response.parsed.featureComparisonMatrix || [],
    marketGapAnalysis: response.parsed.marketGapAnalysis || {
      whatCompetitorsAreMissing: ['Localized Indian pricing and workflow context'],
      whatCustomersAreMissing: ['Affordable, non-bloated vertical solution'],
      underservedSegments: ['Tier-2 and tier-3 Indian operators'],
      whitespace: ['Zero-setup mobile-friendly onboarding'],
      whatStartupCanDoDifferently: ['Offer transparent INR pricing and instant UPI integration'],
      whatStartupShouldNotCopy: ['Complex enterprise UI menus and seat-based lockins'],
      differentiationOpportunities: ['Hyper-focused workflow speed'],
      proposedAdvantage: `Delivers 80% of value with 90% less complexity for ${audience}.`,
    },
    keyFindings: response.parsed.keyFindings || ['Incumbents are built for enterprise markets, leaving small users underserved'],
    strengths: response.parsed.strengths || ['Focused product scope enables faster execution'],
    weaknesses: response.parsed.weaknesses || ['Competitors possess larger marketing reserves'],
    assumptions: response.parsed.assumptions || ['Incumbents will not aggressively discount to protect small niche segments'],
    recommendations: response.parsed.recommendations || ['Emphasize tailored workflow speed rather than feature bloat'],
    sources: verifiedSources,
    limitations: response.parsed.limitations || ['Competitor pricing and roadmaps reflect publicly observable data.'],
    executionMode: 'live_gemini',
  };

  const validation = CompetitorAnalysisOutputSchema.safeParse(candidate);
  if (!validation.success) {
    logger.error('CompetitorAnalysisAgent output schema validation failed', { errors: validation.error.format() });
    throw new Error(`CompetitorAnalysisAgent output validation failed: ${validation.error.message}`);
  }

  return validation.data as CompetitorAnalysisOutput;
}
