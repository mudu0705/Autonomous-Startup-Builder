import type { IdeaProblemOutput } from '../../../shared/types/agent.ts';
import { IdeaProblemOutputSchema } from '../../../shared/schemas/agentOutputs.schema.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { logger } from '../config/logger.ts';

export async function runIdeaProblemAgent(
  project: {
    name?: string;
    startupIdea: string;
    proposedSolution?: string;
    targetCustomers?: string;
    location?: { country: string; scope: string; locations: string[] };
    analysisDepth?: string;
  },
  analysisId: string
): Promise<IdeaProblemOutput> {
  const startupName = project.name || 'Your Startup';
  const idea = project.startupIdea;
  const solution = project.proposedSolution || 'AI-assisted automation and structured workflow';
  const audience = project.targetCustomers || 'Target users in India';
  const loc = project.location?.scope ? `${project.location.country} (${project.location.scope})` : 'India';

  if (!geminiProvider.isAvailable()) {
    throw new Error('Gemini AI Provider is not available. GEMINI_API_KEY is required for Idea & Problem Agent analysis.');
  }

  const prompt = `You are the specialized Idea & Problem Agent for startup evaluation.
Analyze this startup idea to answer the core question: "Is this a meaningful problem worth solving?"

STARTUP NAME: ${startupName}
STARTUP IDEA / PROBLEM: ${idea}
PROPOSED SOLUTION: ${solution}
TARGET CUSTOMERS: ${audience}
GEOGRAPHY: ${loc}

Respond with valid JSON matching this exact structure:
{
  "agentId": "idea_problem",
  "name": "Idea & Problem Agent",
  "score": <number 0-100 evaluating problem-solution fit & severity of problem>,
  "confidence": <number 0.7-0.95>,
  "executiveSummary": "<2-3 clear sentences assessing whether this is a meaningful problem worth solving and evaluating the core solution validity>",
  "problemStatement": "<Crisp formulation of the core pain point>",
  "rootCauses": ["<cause 1>", "<cause 2>", "<cause 3>"],
  "targetUsers": "${audience}",
  "painPoints": ["<pain point 1>", "<pain point 2>", "<pain point 3>"],
  "currentAlternatives": ["<how users currently solve this>", "<manual workaround or existing tool>"],
  "proposedSolution": "${solution}",
  "valueProposition": "<Unique quantified value proposition statement>",
  "problemSolutionFit": "<Strong / Moderate / Developing fit explanation>",
  "keyFindings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "assumptions": ["<untested problem assumption 1>", "<untested customer behavior assumption 2>"],
  "recommendations": ["<recommended action 1>", "<recommended action 2>"],
  "improvementOpportunities": ["<opportunity 1>", "<opportunity 2>"],
  "sources": [],
  "limitations": ["Analysis based on user-provided intake context"],
  "executionMode": "live_gemini"
}

Return JSON only. Do not fabricate external research.`;

  const response = await geminiProvider.generateStructured<Partial<IdeaProblemOutput>>({
    prompt,
    systemPrompt: 'You are an expert venture analyst specializing in problem-solution fit and customer problem definition. Return JSON only.',
    temperature: 0.2,
  });

  if (!response.parsed) {
    throw new Error('IdeaProblemAgent received empty response from Gemini');
  }

  const candidate = {
    agentId: 'idea_problem',
    name: 'Idea & Problem Agent',
    score: Math.min(100, Math.max(0, response.parsed.score ?? 75)),
    confidence: response.parsed.confidence ?? 0.85,
    executiveSummary: response.parsed.executiveSummary || `The proposed solution directly addresses pain points for ${audience}.`,
    problemStatement: response.parsed.problemStatement || `Friction and manual overhead experienced by ${audience} in ${idea}.`,
    rootCauses: response.parsed.rootCauses || ['Lack of dedicated domain tools', 'Fragmented manual processes'],
    targetUsers: response.parsed.targetUsers || audience,
    painPoints: response.parsed.painPoints || ['Excessive time wasted', 'High error rates'],
    currentAlternatives: response.parsed.currentAlternatives || ['Spreadsheets & manual tracking', 'Generic software'],
    proposedSolution: response.parsed.proposedSolution || solution,
    valueProposition: response.parsed.valueProposition || `Streamlines operations for ${audience}.`,
    problemSolutionFit: response.parsed.problemSolutionFit || 'Moderate to strong problem-solution fit.',
    keyFindings: response.parsed.keyFindings || ['Clear addressable user pain point'],
    strengths: response.parsed.strengths || ['Addresses high-frequency operational pain'],
    weaknesses: response.parsed.weaknesses || ['Potential user inertia'],
    assumptions: response.parsed.assumptions || ['Target users are willing to adopt digital tools'],
    recommendations: response.parsed.recommendations || ['Conduct 15 customer discovery interviews'],
    improvementOpportunities: response.parsed.improvementOpportunities || ['Offer self-serve onboarding'],
    sources: response.parsed.sources || [],
    limitations: response.parsed.limitations || ['Assessment grounded in founder intake data.'],
    executionMode: 'live_gemini',
  };

  const validation = IdeaProblemOutputSchema.safeParse(candidate);
  if (!validation.success) {
    logger.error('IdeaProblemAgent output schema validation failed', { errors: validation.error.format() });
    throw new Error(`IdeaProblemAgent output validation failed: ${validation.error.message}`);
  }

  return validation.data as IdeaProblemOutput;
}
