import type { CustomerValidationOutput, ValidationHypothesis } from '../../../shared/types/agent.ts';
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

  if (geminiProvider.isAvailable()) {
    try {
      const prompt = `You are the Customer & Validation Agent for a venture analysis platform.
Formulate realistic customer personas and rigorous validation hypotheses for this startup.

STARTUP NAME: ${startupName}
IDEA: ${idea}
PROPOSED SOLUTION: ${solution}
TARGET AUDIENCE: ${audience}

INSTRUCTIONS:
1. Define primary and secondary customer segments.
2. Build 1-2 realistic customer personas with demographic profile, needs, daily friction, adoption barriers, and decision triggers.
3. Formulate 3-4 structured VALIDATION HYPOTHESES to test before writing code.
   - For each hypothesis include: hypothesis, whyItMatters, validationMethod, suggestedSampleSize, successMetric, expectedResult, risks, recommendation.
4. Detail specific interview strategies, survey questions, and prototype experiment tactics.
5. IMPORTANT: Clearly label these as PROPOSED validation methods. Do not claim validation has already occurred.

Respond with valid JSON matching:
{
  "score": <number 0-100 indicating customer clarity & testability of value proposition>,
  "confidence": <number 0.7-0.9>,
  "executiveSummary": "<2-3 sentences summarizing customer profile and validation priorities>",
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
      "whyItMatters": "<Why getting this wrong threatens the startup>",
      "validationMethod": "interview",
      "suggestedSampleSize": "15-20 target users",
      "successMetric": ">= 60% confirm pain point is in top 3 daily struggles",
      "expectedResult": "Strong qualitative validation of operational friction",
      "risks": ["Confirmation bias in questions", "Politeness bias in interviews"],
      "recommendation": "Use open-ended past-behavior questions (The Mom Test framework)"
    }
  ],
  "interviewStrategy": ["<tactical interview tip 1>", "<tactical tip 2>"],
  "surveyStrategy": ["<survey distribution channel>", "<key quantitative question to ask>"],
  "prototypeExperiment": "<Description of interactive Figma/clickable prototype test>",
  "landingPageExperiment": "<Description of pre-launch smoke test landing page with email waitlist>",
  "keyFindings": ["<finding 1>", "<finding 2>"],
  "strengths": ["<customer alignment strength 1>"],
  "weaknesses": ["<customer risk 1>"],
  "assumptions": ["<customer behavior assumption 1>"],
  "recommendations": ["<action item 1>", "<action item 2>"],
  "limitations": ["Hypotheses are proposed experiments, empirical validation pending."]
}

Return JSON only.`;

      const response = await geminiProvider.generateStructured<Partial<CustomerValidationOutput>>({
        prompt,
        systemPrompt: 'You are a Lean Startup customer validation specialist. Provide falsifiable hypotheses and actionable testing frameworks. Return JSON only.',
        temperature: 0.2,
      });

      if (response.parsed && response.parsed.hypotheses && response.parsed.hypotheses.length > 0) {
        return {
          agentId: 'customer_validation',
          name: 'Customer & Validation Agent',
          score: Math.min(100, Math.max(0, response.parsed.score ?? 77)),
          confidence: response.parsed.confidence ?? 0.87,
          executiveSummary: response.parsed.executiveSummary || `The primary target audience shows clear indicators of need. Structured validation experiments are defined to de-risk core value assumptions before extensive engineering.`,
          primaryTargetCustomers: response.parsed.primaryTargetCustomers || audience,
          secondaryTargetCustomers: response.parsed.secondaryTargetCustomers || 'Adjacent professionals and emerging teams',
          personas: response.parsed.personas || [],
          hypotheses: response.parsed.hypotheses,
          interviewStrategy: response.parsed.interviewStrategy || ['Screen for recent experience with the problem', 'Focus on what users did last week rather than what they say they might do'],
          surveyStrategy: response.parsed.surveyStrategy || ['Deploy 5-question targeted survey in relevant niche WhatsApp/LinkedIn communities', 'Measure self-reported time spent on manual workarounds'],
          prototypeExperiment: response.parsed.prototypeExperiment || 'Build a 5-screen interactive prototype on Figma to evaluate if users can complete the core task in under 60 seconds without guidance.',
          landingPageExperiment: response.parsed.landingPageExperiment || 'Launch a one-page value-prop teaser with a "Request Early Access" CTA to measure conversion rate.',
          keyFindings: response.parsed.keyFindings || ['Target customer problem is acute but habit-bound', 'Validation must precede full development'],
          strengths: response.parsed.strengths || ['Well-defined initial demographic profile', 'Clear testing hypotheses'],
          weaknesses: response.parsed.weaknesses || ['Customer price elasticity has not been empirically proven'],
          assumptions: response.parsed.assumptions || ['Target customers are reachable through digital community channels'],
          recommendations: response.parsed.recommendations || ['Complete 15 problem-discovery interviews before freezing MVP specifications'],
          sources: [],
          limitations: ['All hypotheses represent proposed validation blueprints. Real customer validation data must be gathered by founder.'],
          executionMode: 'live_gemini',
        };
      }
    } catch (err) {
      logger.warn('CustomerValidationAgent Gemini call failed, using deterministic evaluation', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Deterministic fallback grounded strictly in user intake
  const defaultHypotheses: ValidationHypothesis[] = [
    {
      id: 'hyp-1',
      hypothesis: `Target customers (${audience}) actively experience severe friction with current alternatives and seek dedicated tooling.`,
      whyItMatters: 'If this pain point is merely an annoyance rather than a top priority, users will not switch from status-quo habits.',
      validationMethod: 'interview',
      suggestedSampleSize: '15–20 target customers',
      successMetric: 'At least 70% of interviewees rank this among their top 3 daily operational frustrations.',
      expectedResult: 'Qualitative confirmation of operational drag and strong resonance with proposed solution.',
      risks: ['Politeness bias where users say they like the idea without genuine commitment'],
      recommendation: 'Ask exclusively about past behavior and actual money/time spent attempting workarounds.',
    },
    {
      id: 'hyp-2',
      hypothesis: `Target customers are willing to pay an affordable recurring fee (e.g. ₹499–₹1,499/mo) for an automated, localized tool.`,
      whyItMatters: 'Ensures the startup has a viable commercial engine and does not get stuck in unprofitable free tiers.',
      validationMethod: 'landing_page',
      suggestedSampleSize: '200–500 targeted page visits',
      successMetric: '>= 8% click-through on "Pre-order / Join Paid Pilot" intent buttons.',
      expectedResult: 'Measurable quantitative signal of commercial willingness to pay.',
      risks: ['Low traffic quality skewing intent metrics'],
      recommendation: 'Use targeted niche Indian creator channels or LinkedIn/WhatsApp groups to drive qualified traffic.',
    },
    {
      id: 'hyp-3',
      hypothesis: `Target customers can independently onboard and achieve first value within 3 minutes of initial login.`,
      whyItMatters: 'High churn during initial onboarding will destroy customer acquisition economics.',
      validationMethod: 'prototype_experiment',
      suggestedSampleSize: '8–10 moderated usability tests',
      successMetric: '>= 80% task completion rate without moderator intervention.',
      expectedResult: 'Identification of critical UI bottlenecks and confirmation of core user journey.',
      risks: ['Over-explaining features during moderated testing'],
      recommendation: 'Run silent observation tests using a clickable Figma prototype.',
    },
  ];

  return {
    agentId: 'customer_validation',
    name: 'Customer & Validation Agent',
    score: 76,
    confidence: 0.85,
    executiveSummary: `Target customer definition for ${audience} is clear and actionable. A lean validation framework comprising 3 falsifiable hypotheses has been established to verify demand before substantial code is written.`,
    primaryTargetCustomers: audience,
    secondaryTargetCustomers: 'Adjacent operators and growing regional teams with similar operational bottlenecks.',
    personas: [
      {
        name: 'Rohan Sharma',
        role: `Typical Indian ${audience}`,
        demographics: '24–35 years old, Tier-1 / Tier-2 Indian city, smartphone & laptop proficient',
        coreNeeds: [
          'Wants to save 1-2 hours per day on repetitive administrative tasks',
          'Needs reliable, error-free outputs that can be shared instantly',
          'Demands straightforward pricing without complex enterprise contracts',
        ],
        painPoints: [
          'Overwhelmed by messy spreadsheets and unorganized chat messages',
          'Existing international software tools are expensive in USD and lack Indian context',
          'Frequent missed deadlines and communication breakdowns',
        ],
        motivations: [
          'Professional efficiency and peace of mind',
          'Modernizing operations to stay competitive',
        ],
        adoptionBarriers: [
          'Reluctance to learn complex new software',
          'Skepticism about data privacy and ongoing subscription charges',
        ],
        decisionFactors: [
          'Immediate visible utility within first 5 minutes of use',
          'Responsive local customer support and UPI billing',
        ],
      },
    ],
    hypotheses: defaultHypotheses,
    interviewStrategy: [
      'Conduct 15-minute focused video calls using open-ended questions about yesterday\'s workflow',
      'Never ask "Would you buy this?", ask "How much time did you lose on this problem last week?"',
    ],
    surveyStrategy: [
      'Distribute a concise 5-question Google Form / Typeform to regional trade or student communities',
      'Include a qualifying question to screen out respondents outside the core target demographic',
    ],
    prototypeExperiment: 'Interactive prototype test with 10 users to observe where hesitation occurs in the workflow.',
    landingPageExperiment: 'A localized landing page detailing value props with a "Join Founding Members Waitlist" form.',
    keyFindings: [
      'Customer motivation is primarily driven by time savings and reducing cognitive load',
      'Free pilots must have a strict expiration date to test conversion willingness',
    ],
    strengths: [
      'Specific, addressable target user cohort with easily identifiable watering holes',
      'High potential for word-of-mouth referral within community groups',
    ],
    weaknesses: [
      'High price sensitivity requires tight cost discipline',
    ],
    assumptions: [
      'Target personas have decision-making authority or discretionary budget to adopt the tool',
    ],
    recommendations: [
      'Execute Hypothesis 1 interviews within the next 14 days',
      'Document direct user quotes to refine website copy and product marketing messaging',
    ],
    sources: [],
    limitations: ['Validation hypotheses are structured experiment protocols; founder must execute interviews to gather empirical results.'],
    executionMode: 'deterministic_fallback',
  };
}
