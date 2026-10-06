import type { RiskFeasibilityOutput, RiskItem } from '../../../shared/types/agent.ts';
import { RiskFeasibilityOutputSchema } from '../../../shared/schemas/agentOutputs.schema.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { logger } from '../config/logger.ts';

export async function runRiskFeasibilityAgent(
  project: {
    name?: string;
    startupIdea: string;
    proposedSolution?: string;
    targetCustomers?: string;
    location?: { country: string; scope: string; locations: string[] };
    budget?: { amount: number | null };
  },
  analysisId: string
): Promise<RiskFeasibilityOutput> {
  const startupName = project.name || 'Your Startup';
  const idea = project.startupIdea;
  const audience = project.targetCustomers || 'Target users';
  const solution = project.proposedSolution || 'Digital application';
  const budget = project.budget?.amount || 500000;

  if (!geminiProvider.isAvailable()) {
    throw new Error('Gemini AI Provider is not available. GEMINI_API_KEY is required for Risk & Feasibility Agent analysis.');
  }

  const prompt = `You are the Risk & Feasibility Agent for startup evaluation.
Conduct a rigorous risk assessment across ALL 9 venture risk categories:
1. market risk
2. customer risk
3. technical risk
4. financial risk
5. operational risk
6. competitive risk
7. regulatory risk
8. security (privacy/data) risk
9. scalability risk

STARTUP: ${startupName}
IDEA: ${idea}
SOLUTION: ${solution}
TARGET AUDIENCE: ${audience}
BUDGET: ₹${budget.toLocaleString()} INR

INSTRUCTIONS:
1. Identify specific, non-generic risks across the 9 categories above.
2. For each risk provide: category, risk description, likelihood ("Low", "Medium", or "High"), impact ("Low", "Medium", or "High"), severityScore (1-9), and mitigation strategy.
3. Score 4 feasibility dimensions (0-100): technicalFeasibility, marketFeasibility, financialFeasibility, operationalFeasibility, and overallFeasibility.
4. Summarize major concerns and clear mitigation recommendations.

Respond with valid JSON matching:
{
  "agentId": "risk_feasibility",
  "name": "Risk & Feasibility Agent",
  "score": <number 0-100 indicating overall risk defensibility & feasibility>,
  "confidence": <number 0.8-0.95>,
  "executiveSummary": "<2 sentences summarizing overall feasibility and critical risk factors>",
  "risks": [
    {
      "category": "market",
      "risk": "<Market adoption risk>",
      "likelihood": "Medium",
      "impact": "High",
      "severityScore": 6,
      "mitigation": "<Actionable mitigation>"
    },
    {
      "category": "customer",
      "risk": "<Customer habit inertia risk>",
      "likelihood": "Medium",
      "impact": "High",
      "severityScore": 6,
      "mitigation": "<Actionable mitigation>"
    },
    {
      "category": "technical",
      "risk": "<Technical integration or API risk>",
      "likelihood": "Low",
      "impact": "Medium",
      "severityScore": 3,
      "mitigation": "<Actionable mitigation>"
    },
    {
      "category": "financial",
      "risk": "<Runway burn risk>",
      "likelihood": "Medium",
      "impact": "High",
      "severityScore": 6,
      "mitigation": "<Actionable mitigation>"
    },
    {
      "category": "operational",
      "risk": "<Team execution bandwidth risk>",
      "likelihood": "Medium",
      "impact": "Medium",
      "severityScore": 4,
      "mitigation": "<Actionable mitigation>"
    },
    {
      "category": "competitive",
      "risk": "<Incumbent copycat risk>",
      "likelihood": "Medium",
      "impact": "Medium",
      "severityScore": 5,
      "mitigation": "<Actionable mitigation>"
    },
    {
      "category": "regulatory",
      "risk": "<Indian compliance/payment mandate risk>",
      "likelihood": "Low",
      "impact": "Medium",
      "severityScore": 3,
      "mitigation": "<Actionable mitigation>"
    },
    {
      "category": "security",
      "risk": "<Data privacy and user auth security risk>",
      "likelihood": "Low",
      "impact": "High",
      "severityScore": 4,
      "mitigation": "<Actionable mitigation>"
    },
    {
      "category": "scalability",
      "risk": "<Database or server concurrency scaling risk>",
      "likelihood": "Low",
      "impact": "Medium",
      "severityScore": 3,
      "mitigation": "<Actionable mitigation>"
    }
  ],
  "feasibilityScores": {
    "technicalFeasibility": 85,
    "marketFeasibility": 72,
    "financialFeasibility": 70,
    "operationalFeasibility": 80,
    "overallFeasibility": 76
  },
  "feasibilityConclusion": "<Summary paragraph stating whether the project is practically executable>",
  "majorConcerns": ["<major concern 1>", "<major concern 2>"],
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<feasibility strength 1>"],
  "weaknesses": ["<vulnerability 1>"],
  "assumptions": ["<risk assumption 1>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "sources": [],
  "limitations": ["Risk evaluation based on early-stage venture parameters."],
  "executionMode": "live_gemini"
}

Return JSON only.`;

  const response = await geminiProvider.generateStructured<Partial<RiskFeasibilityOutput>>({
    prompt,
    systemPrompt: 'You are a veteran venture capital risk assessor and enterprise audit specialist. Return JSON only.',
    temperature: 0.2,
  });

  if (!response.parsed) {
    throw new Error('RiskFeasibilityAgent received empty response from Gemini');
  }

  const candidate = {
    agentId: 'risk_feasibility',
    name: 'Risk & Feasibility Agent',
    score: Math.min(100, Math.max(0, response.parsed.score ?? 74)),
    confidence: response.parsed.confidence ?? 0.88,
    executiveSummary: response.parsed.executiveSummary || `Overall venture feasibility is viable with manageable operational and technical hurdles.`,
    risks: response.parsed.risks || [],
    feasibilityScores: response.parsed.feasibilityScores || {
      technicalFeasibility: 85,
      marketFeasibility: 72,
      financialFeasibility: 70,
      operationalFeasibility: 80,
      overallFeasibility: 76,
    },
    feasibilityConclusion: response.parsed.feasibilityConclusion || 'Project is technically and operationally feasible for a lean founding team.',
    majorConcerns: response.parsed.majorConcerns || ['Customer conversion inertia', 'Runway management during early trial phases'],
    keyFindings: response.parsed.keyFindings || ['Technical execution carries low execution risk'],
    strengths: response.parsed.strengths || ['Standard web architecture eliminates high-risk hardware or exotic algorithms'],
    weaknesses: response.parsed.weaknesses || ['Customer price elasticity remains unproven'],
    assumptions: response.parsed.assumptions || ['Key third-party APIs remain stable'],
    recommendations: response.parsed.recommendations || ['Establish weekly cash burn tracking'],
    sources: [],
    limitations: response.parsed.limitations || ['Risk scores reflect modeled probability matrix.'],
    executionMode: 'live_gemini',
  };

  const validation = RiskFeasibilityOutputSchema.safeParse(candidate);
  if (!validation.success) {
    logger.error('RiskFeasibilityAgent output schema validation failed', { errors: validation.error.format() });
    throw new Error(`RiskFeasibilityAgent output validation failed: ${validation.error.message}`);
  }

  return validation.data as RiskFeasibilityOutput;
}
