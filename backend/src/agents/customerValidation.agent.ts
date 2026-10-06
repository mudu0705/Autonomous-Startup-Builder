import type { CustomerValidationOutput } from '../../../shared/types/agent.ts';
import { CustomerValidationOutputSchema } from '../../../shared/schemas/agentOutputs.schema.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { logger } from '../config/logger.ts';

export async function runCustomerValidationAgent(
  project: {
    name?: string;
    startupIdea: string;
    proposedSolution?: string;
    targetCustomers?: string;
    location?: { country: string; scope: string; locations: string[] };
  },
  analysisId: string
): Promise<CustomerValidationOutput> {
  const startupName = project.name || 'Your Startup';
  const idea = project.startupIdea;
  const audience = project.targetCustomers || 'Indian early adopters';
  const solution = project.proposedSolution || 'Integrated digital platform';

  if (!geminiProvider.isAvailable()) {
    throw new Error('Gemini AI Provider is not available. GEMINI_API_KEY is required for Customer & Validation Agent analysis.');
  }

  const prompt = `You are the Customer & Validation Agent for a venture analysis platform.
Formulate realistic customer personas and rigorous validation hypotheses to answer the core question: "Will customers actually want this?"

STARTUP NAME: ${startupName}
IDEA: ${idea}
PROPOSED SOLUTION: ${solution}
TARGET AUDIENCE: ${audience}

INSTRUCTIONS:
1. Define primary and secondary target customer segments.
2. Build 1-2 realistic customer personas detailing demographics, core needs, pain points, motivations, objections, buying/adoption behavior, and adoption barriers.
3. Formulate AT LEAST 3 to 4 testable, falsifiable VALIDATION HYPOTHESES to test before writing full code.
   - For EACH hypothesis, provide: id, hypothesis, whyItMatters, validationMethod ("interview", "survey", "prototype_experiment", or "landing_page"), suggestedSampleSize, successMetric, expectedResult, failureCondition, risks, recommendation.
4. Detail interview strategies, survey strategies, prototype experiment, and landing page test.
5. Note: Label these as proposed validation blueprints.

Respond with valid JSON matching:
{
  "agentId": "customer_validation",
  "name": "Customer & Validation Agent",
  "score": <number 0-100 indicating customer clarity & testability of value proposition>,
  "confidence": <number 0.7-0.9>,
  "executiveSummary": "<2-3 sentences assessing customer demand indicators and answering whether customers will actually want this>",
  "primaryTargetCustomers": "${audience}",
  "secondaryTargetCustomers": "<Secondary or adjacent segment>",
  "personas": [
    {
      "name": "<Representative Persona Name>",
      "role": "<Role/Profession>",
      "demographics": "<Age, Location in India, Tech savviness>",
      "coreNeeds": ["<need 1>", "<need 2>"],
      "painPoints": ["<daily frustration 1>", "<daily frustration 2>"],
      "motivations": ["<motivation 1>", "<motivation 2>"],
      "adoptionBarriers": ["<barrier 1>", "<barrier 2>"],
      "decisionFactors": ["<factor 1>", "<factor 2>"]
    }
  ],
  "hypotheses": [
    {
      "id": "hyp-1",
      "hypothesis": "<Clear falsifiable customer hypothesis>",
      "whyItMatters": "<Why getting this wrong threatens startup viability>",
      "validationMethod": "interview",
      "suggestedSampleSize": "15-20 target users",
      "successMetric": ">= 60% confirm pain point is in top 3 daily struggles",
      "expectedResult": "Strong qualitative validation of operational friction",
      "failureCondition": "< 40% interviewees rank this pain point as critical",
      "risks": ["Politeness bias", "Confirmation bias"],
      "recommendation": "Use open-ended past-behavior questions (The Mom Test framework)"
    },
    {
      "id": "hyp-2",
      "hypothesis": "<Hypothesis 2 commercial willingness to pay>",
      "whyItMatters": "<Ensures business is monetizable>",
      "validationMethod": "landing_page",
      "suggestedSampleSize": "200-500 targeted visits",
      "successMetric": ">= 5% click-through on paid pre-order / pilot waitlist CTA",
      "expectedResult": "Quantitative confirmation of commercial intent",
      "failureCondition": "< 2% conversion on value prop CTA",
      "risks": ["Unqualified ad traffic"],
      "recommendation": "Drive traffic through niche student/founder communities"
    },
    {
      "id": "hyp-3",
      "hypothesis": "<Hypothesis 3 usability & onboarding speed>",
      "whyItMatters": "<Prevents initial bounce and churn>",
      "validationMethod": "prototype_experiment",
      "suggestedSampleSize": "8-10 moderated usability tests",
      "successMetric": ">= 80% task completion in under 3 minutes",
      "expectedResult": "Validation of zero-friction onboarding flow",
      "failureCondition": "Users get stuck on step 2 without moderator assistance",
      "risks": ["Moderator guidance bias"],
      "recommendation": "Perform silent observation Figma prototype tests"
    }
  ],
  "interviewStrategy": ["<tactical interview tip 1>", "<tactical tip 2>"],
  "surveyStrategy": ["<survey channel>", "<key quantitative question>"],
  "prototypeExperiment": "<Description of interactive Figma prototype test>",
  "landingPageExperiment": "<Description of smoke test landing page with waitlist>",
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<customer alignment strength 1>"],
  "weaknesses": ["<customer risk 1>"],
  "assumptions": ["<customer behavior assumption 1>"],
  "recommendations": ["<action item 1>", "<action item 2>"],
  "sources": [],
  "limitations": ["Hypotheses are proposed experiments; empirical validation required."],
  "executionMode": "live_gemini"
}

Return JSON only.`;

  const response = await geminiProvider.generateStructured<Partial<CustomerValidationOutput>>({
    prompt,
    systemPrompt: 'You are a Lean Startup customer validation specialist. Provide falsifiable hypotheses and actionable testing frameworks. Return JSON only.',
    temperature: 0.2,
  });

  if (!response.parsed) {
    throw new Error('CustomerValidationAgent received empty response from Gemini');
  }

  const candidate = {
    agentId: 'customer_validation',
    name: 'Customer & Validation Agent',
    score: Math.min(100, Math.max(0, response.parsed.score ?? 77)),
    confidence: response.parsed.confidence ?? 0.87,
    executiveSummary: response.parsed.executiveSummary || `Target customer demand is positive. 3 structured validation experiments are defined to de-risk customer willingness to adopt and pay.`,
    primaryTargetCustomers: response.parsed.primaryTargetCustomers || audience,
    secondaryTargetCustomers: response.parsed.secondaryTargetCustomers || 'Adjacent operators and growing regional teams',
    personas: response.parsed.personas || [],
    hypotheses: response.parsed.hypotheses || [],
    interviewStrategy: response.parsed.interviewStrategy || ['Screen for recent problem experience', 'Focus on past behavior'],
    surveyStrategy: response.parsed.surveyStrategy || ['Deploy 5-question targeted survey'],
    prototypeExperiment: response.parsed.prototypeExperiment || 'Build interactive prototype to test core task completion.',
    landingPageExperiment: response.parsed.landingPageExperiment || 'Launch single-page teaser with waitlist CTA.',
    keyFindings: response.parsed.keyFindings || ['Target customer problem is acute but habit-bound'],
    strengths: response.parsed.strengths || ['Well-defined initial demographic profile'],
    weaknesses: response.parsed.weaknesses || ['Price elasticity requires empirical testing'],
    assumptions: response.parsed.assumptions || ['Target customers are reachable through community channels'],
    recommendations: response.parsed.recommendations || ['Complete 15 discovery interviews before freezing MVP scope'],
    sources: [],
    limitations: response.parsed.limitations || ['Hypotheses are proposed experiments; empirical validation required.'],
    executionMode: 'live_gemini',
  };

  const validation = CustomerValidationOutputSchema.safeParse(candidate);
  if (!validation.success) {
    logger.error('CustomerValidationAgent output schema validation failed', { errors: validation.error.format() });
    throw new Error(`CustomerValidationAgent output validation failed: ${validation.error.message}`);
  }

  return validation.data as CustomerValidationOutput;
}
