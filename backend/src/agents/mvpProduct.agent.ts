import type { MvpProductOutput } from '../../../shared/types/agent.ts';
import { MvpProductOutputSchema } from '../../../shared/schemas/agentOutputs.schema.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { logger } from '../config/logger.ts';

export async function runMvpProductAgent(
  project: {
    name?: string;
    startupIdea: string;
    proposedSolution?: string;
    targetCustomers?: string;
  },
  analysisId: string
): Promise<MvpProductOutput> {
  const startupName = project.name || 'Your Startup';
  const idea = project.startupIdea;
  const audience = project.targetCustomers || 'Target users';
  const solution = project.proposedSolution || 'Automated application';

  if (!geminiProvider.isAvailable()) {
    throw new Error('Gemini AI Provider is not available. GEMINI_API_KEY is required for MVP / Product Agent analysis.');
  }

  const prompt = `You are the MVP / Product Agent for startup architecture.
Create an actionable, lean MVP blueprint for this startup.

STARTUP: ${startupName}
IDEA: ${idea}
PROPOSED SOLUTION: ${solution}
TARGET CUSTOMERS: ${audience}

INSTRUCTIONS:
1. Formulate a crisp MVP objective (what single core outcome must v1 deliver?).
2. Detail 3-4 MUST-HAVE features (P0 priority), 2-3 NICE-TO-HAVE features (P1/P2), and 2-3 FEATURES TO AVOID initially to prevent scope creep.
3. Map a 4-step user journey from landing to value achievement.
4. Propose a pragmatic, modern technical architecture suited for an Indian tech startup (e.g. React/Vite/Tailwind, Node.js/Fastify/Express, MongoDB/PostgreSQL, UPI payment gateway, Render/Vercel/AWS).
5. Outline MVP v1 release scope vs MVP v2 roadmap and estimated sprint weeks.

Respond with valid JSON matching:
{
  "agentId": "mvp_product",
  "name": "MVP / Product Agent",
  "score": <number 0-100 evaluating MVP lean efficiency & architectural feasibility>,
  "confidence": <number 0.8-0.95>,
  "executiveSummary": "<2 sentences outlining the MVP scope and technical strategy>",
  "mvpObjective": "<Single sentence defining the core testable outcome of MVP v1>",
  "mustHaveFeatures": [
    { "name": "<Feature 1>", "description": "<What it does>", "priority": "P0", "userValue": "<Why it is essential for v1>" },
    { "name": "<Feature 2>", "description": "<What it does>", "priority": "P0", "userValue": "<Why it is essential for v1>" },
    { "name": "<Feature 3>", "description": "<What it does>", "priority": "P0", "userValue": "<Why it is essential for v1>" }
  ],
  "niceToHaveFeatures": [
    { "name": "<Feature A>", "description": "<What it does>", "priority": "P1", "userValue": "<Value added once v1 succeeds>" }
  ],
  "featuresToAvoidInitially": [
    { "name": "<Bloat feature 1>", "reasonToAvoid": "<Why it distracts from core proposition>" },
    { "name": "<Complex feature 2>", "reasonToAvoid": "<Why it delays initial launch>" }
  ],
  "userJourneySteps": [
    { "step": 1, "userAction": "Discovers value prop and signs up in under 60 seconds", "systemResponse": "Instant magic link / OTP verification with empty-state tutorial" },
    { "step": 2, "userAction": "Inputs primary workflow criteria or raw data", "systemResponse": "Processes and provides immediate live preview" },
    { "step": 3, "userAction": "Customizes or approves structured output", "systemResponse": "Generates verified final asset and offers one-click export" },
    { "step": 4, "userAction": "Shares with team or integrates into daily routine", "systemResponse": "Logs activity and prompts scheduled re-engagement" }
  ],
  "technicalArchitecture": {
    "components": ["Client Web App (SPA)", "API Gateway & Auth Service", "Core Processing Engine", "Database Store"],
    "suggestedTechStack": {
      "frontend": ["React", "TypeScript", "Tailwind CSS", "Vite"],
      "backend": ["Node.js", "TypeScript", "Fastify"],
      "database": ["MongoDB", "Mongoose"],
      "hostingInfrastructure": ["Vercel (Frontend)", "Render / AWS ECS (Backend)", "MongoDB Atlas"],
      "keyLibraries": ["Zod (Validation)", "JWT / Argon2 (Security)", "Lucide Icons"]
    },
    "integrations": ["Razorpay / Cashfree (UPI & Billing)", "Sendgrid / Resend (Email)", "WhatsApp Cloud API"],
    "dataFlowSummary": "Client communicates via authenticated REST API with backend; data validated via Zod schemas and persisted in MongoDB."
  },
  "roadmap": {
    "mvpV1": ["Core onboarding flow", "Primary workflow engine", "Basic export", "UPI payment checkout"],
    "mvpV2Future": ["Multi-user team workspaces", "Automated analytics", "Custom template marketplace"],
    "estimatedSprintWeeks": 6
  },
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<product strength 1>"],
  "weaknesses": ["<product risk 1>"],
  "assumptions": ["<technical assumption 1>"],
  "recommendations": ["<product recommendation 1>", "<recommendation 2>"],
  "sources": [],
  "limitations": ["Architecture designed for lean prototype and initial scale up to 10,000 DAU."],
  "executionMode": "live_gemini"
}

Return JSON only.`;

  const response = await geminiProvider.generateStructured<Partial<MvpProductOutput>>({
    prompt,
    systemPrompt: 'You are a pragmatic VP of Engineering and Startup Product Architect. Avoid premature optimization and enterprise bloat. Return JSON only.',
    temperature: 0.2,
  });

  if (!response.parsed) {
    throw new Error('MvpProductAgent received empty response from Gemini');
  }

  const candidate = {
    agentId: 'mvp_product',
    name: 'MVP / Product Agent',
    score: Math.min(100, Math.max(0, response.parsed.score ?? 78)),
    confidence: response.parsed.confidence ?? 0.88,
    executiveSummary: response.parsed.executiveSummary || `The MVP blueprint prioritizes speed-to-market with a clean build timeline focusing on the core user loop.`,
    mvpObjective: response.parsed.mvpObjective || `Enable ${audience} to complete the primary workflow in under 3 minutes.`,
    mustHaveFeatures: response.parsed.mustHaveFeatures || [],
    niceToHaveFeatures: response.parsed.niceToHaveFeatures || [],
    featuresToAvoidInitially: response.parsed.featuresToAvoidInitially || [],
    userJourneySteps: response.parsed.userJourneySteps || [],
    technicalArchitecture: response.parsed.technicalArchitecture || {
      components: ['Responsive Web Application', 'Fastify REST API', 'MongoDB Store'],
      suggestedTechStack: {
        frontend: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
        backend: ['Node.js', 'Fastify', 'TypeScript'],
        database: ['MongoDB', 'Mongoose'],
        hostingInfrastructure: ['Vercel', 'Render', 'MongoDB Atlas'],
        keyLibraries: ['Zod', 'JWT', 'Lucide React'],
      },
      integrations: ['Razorpay / UPI', 'Transactional Email'],
      dataFlowSummary: 'Modular client-server architecture with shared TypeScript types and Zod boundary validation.',
    },
    roadmap: response.parsed.roadmap || {
      mvpV1: ['Core workflow engine', 'Authentication & onboarding', 'Report generation'],
      mvpV2Future: ['Team collaboration', 'Advanced analytics'],
      estimatedSprintWeeks: 6,
    },
    keyFindings: response.parsed.keyFindings || ['Lean MVP can be deployed within 6 weeks using modern component libraries'],
    strengths: response.parsed.strengths || ['High velocity modular stack with TypeScript'],
    weaknesses: response.parsed.weaknesses || ['Third-party API dependency requires retry safeguards'],
    assumptions: response.parsed.assumptions || ['Web responsive experience is sufficient for initial validation'],
    recommendations: response.parsed.recommendations || ['Validate wireframes with 5 users before writing frontend code'],
    sources: [],
    limitations: response.parsed.limitations || ['Technical specification scoped for initial launch and first 10,000 users.'],
    executionMode: 'live_gemini',
  };

  const validation = MvpProductOutputSchema.safeParse(candidate);
  if (!validation.success) {
    logger.error('MvpProductAgent output schema validation failed', { errors: validation.error.format() });
    throw new Error(`MvpProductAgent output validation failed: ${validation.error.message}`);
  }

  return validation.data as MvpProductOutput;
}
