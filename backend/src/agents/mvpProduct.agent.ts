import type { MvpProductOutput } from '../../../shared/types/agent.ts';
import { aiProviderManager } from '../ai/provider.manager.ts';
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

  if (aiProviderManager.isAvailable()) {
    try {
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
5. Outline MVP v1 release scope vs MVP v2 roadmap.

Respond with valid JSON matching:
{
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
    { "name": "<Bloat feature 1>", "reasonToAvoid": "<Why it distracts from the core proposition>" },
    { "name": "<Complex feature 2>", "reasonToAvoid": "<Why it delays initial launch>" }
  ],
  "userJourneySteps": [
    { "step": 1, "userAction": "Discovers value prop and signs up in under 60 seconds", "systemResponse": "Instant magic link / OTP verification with empty-state tutorial" },
    { "step": 2, "userAction": "Inputs primary workflow criteria or raw data", "systemResponse": "Processes and provides immediate live preview" },
    { "step": 3, "userAction": "Customizes or approves structured output", "systemResponse": "Generates verified final asset and offers one-click export" },
    { "step": 4, "userAction": "Shares with team or integrates into daily routine", "systemResponse": "Logs activity and prompts scheduled re-engagement" }
  ],
  "technicalArchitecture": {
    "components": ["Client Web App (SPA)", "API Gateway & Auth Service", "Core Processing Engine", "Database & Document Store"],
    "suggestedTechStack": {
      "frontend": ["React", "TypeScript", "Tailwind CSS", "Vite"],
      "backend": ["Node.js", "TypeScript", "Fastify"],
      "database": ["MongoDB", "Mongoose"],
      "hostingInfrastructure": ["Vercel (Frontend)", "Render / Railway / AWS ECS (Backend)", "MongoDB Atlas"],
      "keyLibraries": ["Zod (Validation)", "JWT / Argon2 (Security)", "Lucide Icons"]
    },
    "integrations": ["Razorpay / Cashfree (UPI & Recurring Billing)", "Sendgrid / Postmark (Transactional Email)", "WhatsApp Cloud API"],
    "dataFlowSummary": "Stateless client communicates via authenticated REST API with Fastify backend; data validated via Zod schemas and persisted in MongoDB."
  },
  "roadmap": {
    "mvpV1": ["Core onboarding flow", "Primary workflow automation engine", "Basic export & sharing", "UPI payment checkout"],
    "mvpV2Future": ["Multi-user team workspaces", "Advanced automated analytics", "Custom template marketplace", "Native mobile app wrapper"],
    "estimatedSprintWeeks": 6
  },
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<product strength 1>"],
  "weaknesses": ["<product risk 1>"],
  "assumptions": ["<technical assumption 1>"],
  "recommendations": ["<product recommendation 1>", "<recommendation 2>"],
  "limitations": ["Architecture designed for lean prototype and initial scale up to 10,000 DAU."]
}

Return JSON only.`;

      const response = await aiProviderManager.generateStructured<Partial<MvpProductOutput>>({
        prompt,
        systemPrompt: 'You are a pragmatic VP of Engineering and Startup Product Architect. Avoid premature optimization and enterprise bloat. Return JSON only.',
        temperature: 0.2,
      });

      if (response.parsed && response.parsed.mustHaveFeatures && response.parsed.mustHaveFeatures.length > 0) {
        const activeProvider = aiProviderManager.getActiveProvider();
        const pName = activeProvider?.providerName || aiProviderManager.providerName;
        return {
          agentId: 'mvp_product',
          name: 'MVP / Product Agent',
          score: Math.min(100, Math.max(0, response.parsed.score ?? 78)),
          confidence: response.parsed.confidence ?? 0.88,
          executiveSummary: response.parsed.executiveSummary || `The MVP blueprint prioritizes speed-to-market with a clean 6-week build timeline focusing exclusively on the core user loop.`,
          mvpObjective: response.parsed.mvpObjective || `Enable ${audience} to complete the primary workflow in under 3 minutes with zero training.`,
          mustHaveFeatures: response.parsed.mustHaveFeatures,
          niceToHaveFeatures: response.parsed.niceToHaveFeatures || [],
          featuresToAvoidInitially: response.parsed.featuresToAvoidInitially || [],
          userJourneySteps: response.parsed.userJourneySteps || [],
          technicalArchitecture: response.parsed.technicalArchitecture || {
            components: ['Responsive Web Application', 'Fastify REST API', 'MongoDB Persistence Store'],
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
            mvpV2Future: ['Team collaboration', 'Advanced automated analytics', 'Integration webhooks'],
            estimatedSprintWeeks: 6,
          },
          keyFindings: response.parsed.keyFindings || ['Lean MVP can be deployed within 6 weeks using modern component libraries and managed services', 'Avoiding native mobile apps initially saves 40% in engineering time'],
          strengths: response.parsed.strengths || ['High velocity modular stack with TypeScript across frontend, backend, and shared contracts', 'Minimal infrastructure overhead'],
          weaknesses: response.parsed.weaknesses || ['Third-party API dependency requires rate-limiting and retry safeguards'],
          assumptions: response.parsed.assumptions || ['Web responsive experience is sufficient for initial customer validation'],
          recommendations: response.parsed.recommendations || ['Build interactive wireframes and validate with 5 users before writing frontend code', 'Implement automated error logging from day one'],
          sources: [],
          limitations: ['Technical specification scoped for initial launch and first 10,000 users.'],
          executionMode: pName === 'ollama' ? 'live_ollama' : 'live_gemini',
          provider: pName,
          model: activeProvider?.modelName || aiProviderManager.modelName,
        };
      }
    } catch (err) {
      logger.warn('MvpProductAgent AI call failed, utilizing deterministic blueprint', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Deterministic fallback grounded strictly in user intake
  return {
    agentId: 'mvp_product',
    name: 'MVP / Product Agent',
    score: 78,
    confidence: 0.86,
    executiveSummary: `The MVP architecture for "${startupName}" focuses strictly on the core problem-solving loop, eliminating non-essential features to achieve a functional release within a 6-week engineering window.`,
    mvpObjective: `Provide ${audience} with a fast, reliable mechanism to solve "${idea}" with zero onboarding friction.`,
    mustHaveFeatures: [
      {
        name: 'Streamlined Guided Onboarding',
        description: 'Frictionless signup with minimal form fields, enabling users to enter required parameters in under 90 seconds.',
        priority: 'P0',
        userValue: 'Dramatically reduces initial bounce rate and accelerates first time-to-value.',
      },
      {
        name: 'Automated Processing & Generation Engine',
        description: 'Core computation engine that transforms user input into validated structured outcomes.',
        priority: 'P0',
        userValue: 'The primary value proposition that replaces hours of manual spreadsheet work.',
      },
      {
        name: 'Interactive Review & Visual Dashboard',
        description: 'Clean visual summary displaying generated results with editable fields and status badges.',
        priority: 'P0',
        userValue: 'Gives users confidence and full editorial control over their outputs.',
      },
      {
        name: 'Single-Click Export & Sharing',
        description: 'Formatted PDF and web link export to share results with colleagues or stakeholders.',
        priority: 'P0',
        userValue: 'Enables external utility and organic word-of-mouth distribution.',
      },
    ],
    niceToHaveFeatures: [
      {
        name: 'Custom Team Workspaces',
        description: 'Multi-seat access allowing team members to collaborate on shared projects.',
        priority: 'P1',
        userValue: 'Valuable for team accounts once initial single-user validation is confirmed.',
      },
      {
        name: 'Automated WhatsApp Notifications',
        description: 'Status updates and weekly digests delivered directly via WhatsApp messaging API.',
        priority: 'P2',
        userValue: 'Increases retention for Indian mobile-first users.',
      },
    ],
    featuresToAvoidInitially: [
      {
        name: 'Native iOS / Android App Stores',
        reasonToAvoid: 'Maintains double the codebase and delays MVP release by 8–10 weeks; responsive web app is completely sufficient.',
      },
      {
        name: 'Complex Enterprise Single Sign-On (SSO / SAML)',
        reasonToAvoid: 'Target audience does not require enterprise security protocols at the prototype phase.',
      },
      {
        name: 'AI Chatbot Sidebars with Free-form Conversation',
        reasonToAvoid: 'Introduces unpredictable UX, hallucinations, and high token costs without adding core task value.',
      },
    ],
    userJourneySteps: [
      {
        step: 1,
        userAction: 'Visits landing page, clicks "Analyze", and logs in with email',
        systemResponse: 'Authenticates securely, initializes new project workspace, and loads guided intake wizard.',
      },
      {
        step: 2,
        userAction: 'Answers structured intake questions or provides natural-language overview',
        systemResponse: 'Validates inputs with Zod schemas, extracts key metrics, and displays live progress.',
      },
      {
        step: 3,
        userAction: 'Reviews extracted summary and confirms initiation of analysis',
        systemResponse: 'Executes coordinated background analysis pipeline and updates progress indicators.',
      },
      {
        step: 4,
        userAction: 'Inspects visual score cards, financial models, and exports PDF blueprint',
        systemResponse: 'Renders comprehensive dashboard and stores generated blueprint permanently in MongoDB.',
      },
    ],
    technicalArchitecture: {
      components: [
        'Single Page Application (React / Vite / Tailwind)',
        'REST API & Auth Gateway (Fastify / TypeScript)',
        'Domain Orchestration & Financial Calculation Engine',
        'Persistent Database Store (MongoDB / Mongoose)',
      ],
      suggestedTechStack: {
        frontend: ['React 19', 'TypeScript', 'Tailwind CSS v4', 'Vite', 'Lucide React'],
        backend: ['Node.js v22+', 'TypeScript', 'Fastify v5', 'Argon2', 'JWT'],
        database: ['MongoDB v7+', 'Mongoose v9+'],
        hostingInfrastructure: ['Vercel (Web Client)', 'Render / DigitalOcean (Node API)', 'MongoDB Atlas (Database)'],
        keyLibraries: ['Zod (Type Safety & Validation)', 'Motion (Animations)', 'Recharts (Charts)'],
      },
      integrations: [
        'Razorpay Payment Gateway (UPI, Cards, Netbanking)',
        'Transactional Email (Postmark / Resend)',
        'Cloudflare (DNS, SSL & Edge Caching)',
      ],
      dataFlowSummary: 'Client SPA issues authenticated JWT requests to Fastify endpoints. Boundary data is validated via shared Zod schemas before persisting to MongoDB documents.',
    },
    roadmap: {
      mvpV1: [
        'Week 1–2: Project Setup, Authentication & Core Database Schemas',
        'Week 3–4: Guided Intake & Processing Engine Integration',
        'Week 5: Visual Dashboard, Export Engine & Feedback Loops',
        'Week 6: End-to-End Testing, Security Hardening & Beta Launch',
      ],
      mvpV2Future: [
        'Multi-user team workspace permissions',
        'Real-time webhook triggers and third-party CRM connectors',
        'Comprehensive multi-project comparative benchmarking',
      ],
      estimatedSprintWeeks: 6,
    },
    keyFindings: [
      'A focused 6-week build cycle provides the fastest path to customer feedback without technical over-investment',
      'The modern TypeScript stack allows 100% code sharing of types and validation schemas across client and server',
    ],
    strengths: [
      'Zero unnecessary architectural bloat',
      'Rapid iteration velocity with hot-module reloading and typed contracts',
    ],
    weaknesses: [
      'Requires disciplined scope control to avoid feature creep during development',
    ],
    assumptions: [
      'Founding engineer or developer has standard proficiency in modern TypeScript and React ecosystems',
    ],
    recommendations: [
      'Lock MVP feature scope at P0 features only until 20 active users complete the core loop',
      'Deploy continuous integration (CI) tests to prevent schema regressions',
    ],
    sources: [],
    limitations: ['Architecture optimized for 0 to 10,000 active users with linear horizontal scaling path.'],
    executionMode: 'deterministic_fallback',
  };
}
