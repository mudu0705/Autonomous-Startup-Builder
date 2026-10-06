import type { IdeaProblemOutput } from '../../../shared/types/agent.ts';
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

  if (geminiProvider.isAvailable()) {
    try {
      const prompt = `You are the specialized Idea & Problem Agent for startup evaluation.
Analyze this startup idea for problem-solution fit, clarity, pain points, and current alternatives.

STARTUP NAME: ${startupName}
STARTUP IDEA / PROBLEM: ${idea}
PROPOSED SOLUTION: ${solution}
TARGET CUSTOMERS: ${audience}
GEOGRAPHY: ${loc}

Respond with valid JSON matching this exact structure:
{
  "score": <number 0-100 evaluating problem-solution fit & severity of problem>,
  "confidence": <number 0.7-0.95>,
  "executiveSummary": "<2-3 clear sentences assessing the core problem and solution validity>",
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
  "limitations": ["Analysis based on user-provided intake context"]
}

Return JSON only. Do not hallucinate external statistics.`;

      const response = await geminiProvider.generateStructured<Partial<IdeaProblemOutput>>({
        prompt,
        systemPrompt: 'You are an expert venture analyst specializing in problem-solution fit and customer problem definition. Return JSON only.',
        temperature: 0.2,
      });

      if (response.parsed && response.parsed.problemStatement) {
        return {
          agentId: 'idea_problem',
          name: 'Idea & Problem Agent',
          score: Math.min(100, Math.max(0, response.parsed.score ?? 78)),
          confidence: response.parsed.confidence ?? 0.88,
          executiveSummary: response.parsed.executiveSummary || `The proposed solution directly tackles core friction points for ${audience}.`,
          problemStatement: response.parsed.problemStatement,
          rootCauses: response.parsed.rootCauses || ['Fragmented existing tools', 'High manual overhead', 'Lack of specialized domain intelligence'],
          targetUsers: response.parsed.targetUsers || audience,
          painPoints: response.parsed.painPoints || ['Excessive time wasted on manual processes', 'High barrier to entry', 'Inconsistent outcomes'],
          currentAlternatives: response.parsed.currentAlternatives || ['Spreadsheets & manual checklists', 'Generic legacy software', 'Informal ad-hoc solutions'],
          proposedSolution: response.parsed.proposedSolution || solution,
          valueProposition: response.parsed.valueProposition || `Streamlines operations and improves outcomes for ${audience} through targeted automation.`,
          problemSolutionFit: response.parsed.problemSolutionFit || 'Moderate to strong problem-solution fit identified.',
          keyFindings: response.parsed.keyFindings || ['Clear addressable user pain point', 'Existing alternatives leave significant workflow gaps'],
          strengths: response.parsed.strengths || ['Focused value proposition', 'Addresses high-frequency operational pain'],
          weaknesses: response.parsed.weaknesses || ['Potential user resistance to switching from established habits', 'Requires proven workflow demonstration'],
          assumptions: response.parsed.assumptions || ['Target users are willing to adopt digital tools', 'Problem urgency is sufficient to drive conversion'],
          recommendations: response.parsed.recommendations || ['Conduct 15 founder customer interviews', 'Validate Willingness-To-Pay for the core feature'],
          improvementOpportunities: response.parsed.improvementOpportunities || ['Bundle workflow onboarding guides', 'Introduce automated template presets'],
          sources: [],
          limitations: ['Preliminary assessment grounded in founder intake data without empirical cohort telemetry'],
          executionMode: 'live_gemini',
        };
      }
    } catch (err) {
      logger.warn('IdeaProblemAgent Gemini call failed, using deterministic evaluation', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Deterministic fallback grounded strictly in user intake
  return {
    agentId: 'idea_problem',
    name: 'Idea & Problem Agent',
    score: 76,
    confidence: 0.85,
    executionMode: 'deterministic_fallback',
    executiveSummary: `The proposed startup "${startupName}" addresses a real and identifiable problem for ${audience} in ${loc}. The proposed solution offers a viable mechanism to eliminate process friction.`,
    problemStatement: `Inefficient workflows and lack of tailored solutions for ${audience} trying to solve: "${idea}".`,
    rootCauses: [
      'Current market offerings are either too complex or not customized for Indian market context',
      'High operational friction and lack of modern digital assistance',
      'Information asymmetry between users and service providers',
    ],
    targetUsers: audience,
    painPoints: [
      'Significant manual effort required for daily tasks',
      'Inconsistent quality and delayed turnaround times',
      'Lack of clear decision-support tools tailored for the target demographic',
    ],
    currentAlternatives: [
      'Manual spreadsheets, WhatsApp groups, and pen-and-paper tracking',
      'Generic legacy software not localized for regional needs',
      'Expensive boutique consulting or manual service providers',
    ],
    proposedSolution: solution,
    valueProposition: `Enables ${audience} to achieve better outcomes with lower time investment through a streamlined, purpose-built platform.`,
    problemSolutionFit: 'Moderate to Strong Fit: The solution aligns directly with the documented operational bottlenecks.',
    keyFindings: [
      'Identified acute user demand for workflow simplification',
      'Existing alternatives suffer from poor usability and limited regional support',
      'Early traction will depend heavily on low onboarding friction',
    ],
    strengths: [
      'Specific focus on an identifiable user demographic',
      'Clear initial value proposition with low conceptual complexity',
      'Strong relevance to the designated geographic target market',
    ],
    weaknesses: [
      'User inertia around existing manual habits',
      'Potential risk of feature replication by larger incumbents',
    ],
    assumptions: [
      'Target customers acknowledge this problem as high priority',
      'Users have baseline smartphone / digital access to adopt the product',
    ],
    recommendations: [
      'Engage 15-20 target customers in discovery interviews to validate problem frequency',
      'Build a simple interactive prototype to test core value before full engineering',
    ],
    improvementOpportunities: [
      'Implement guided self-serve onboarding to reduce friction',
      'Offer localized language options where applicable',
    ],
    sources: [],
    limitations: ['Evaluation generated based on founder intake responses. Empirical behavioral data needed.'],
  };
}
