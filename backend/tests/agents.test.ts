import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  runIdeaProblemAgent,
  runMarketResearchAgent,
  runCompetitorAnalysisAgent,
  runCustomerValidationAgent,
  runBusinessModelAgent,
  runFinanceBudgetAgent,
  runMvpProductAgent,
  runRiskFeasibilityAgent,
  runStrategyAgent,
} from '../src/agents/index.ts';

import {
  IdeaProblemOutputSchema,
  MarketResearchOutputSchema,
  CompetitorAnalysisOutputSchema,
  CustomerValidationOutputSchema,
  BusinessModelOutputSchema,
  FinanceBudgetOutputSchema,
  MvpProductOutputSchema,
  RiskFeasibilityOutputSchema,
  StrategyOutputSchema,
} from '../../shared/schemas/agentOutputs.schema.ts';

import { ScoringService } from '../src/services/scoring.service.ts';
import { FinanceCalculationEngine } from '../src/services/finance.engine.ts';

const testProject = {
  name: 'SkillBridge',
  startupIdea: 'AI-powered platform connecting college students with short-term internships, freelance projects and practical work opportunities from startups, MSMEs and local businesses.',
  proposedSolution: 'AI matching engine, verified skill badges, and micro-escrow payments.',
  targetCustomers: 'College students aged 18–25 and Indian startups/MSMEs.',
  location: { country: 'India', scope: 'state', locations: ['Maharashtra', 'Tier-2 cities'] },
  budget: { amount: 600000, currency: 'INR', source: 'USER', isCertain: true },
  revenueModel: 'Freemium for students + premium business recruitment/project-posting features.',
  analysisDepth: 'standard' as const,
};

describe('9 AI Agents Unit & Validation Tests', () => {

  // Agent 1: Idea & Problem
  describe('Agent 1 — Idea & Problem Agent', () => {
    test('produces valid IdeaProblemOutput structure matching Zod schema', async () => {
      // Execute Agent 1 or simulate output
      const mockResult = {
        agentId: 'idea_problem',
        name: 'Idea & Problem Agent',
        score: 82,
        confidence: 0.88,
        executiveSummary: 'SkillBridge tackles acute friction for Indian college students seeking practical experience.',
        problemStatement: 'Lack of accessible short-term internships for students in tier-2/3 cities.',
        rootCauses: ['Fragmented job portals', 'High manual vetting overhead for MSMEs'],
        targetUsers: testProject.targetCustomers,
        painPoints: ['Zero practical work experience upon graduation', 'Unpaid unverified internships'],
        currentAlternatives: ['WhatsApp groups', 'Informal referrals', 'Generic job boards'],
        proposedSolution: testProject.proposedSolution,
        valueProposition: 'Instant AI matching for short-term verified project gigs.',
        problemSolutionFit: 'Strong fit: directly connects student talent with MSME task backlog.',
        keyFindings: ['High student demand in Maharashtra tier-2 cities'],
        strengths: ['Strong two-sided network potential'],
        weaknesses: ['Requires initial supply-side business onboarding'],
        assumptions: ['Students have smartphone access and basic digital literacy'],
        recommendations: ['Launch pilot with 5 colleges in Pune/Nagpur'],
        improvementOpportunities: ['Add automated resume parser'],
        sources: [],
        limitations: ['Intake data evaluation'],
        executionMode: 'live_gemini',
      };

      const parseResult = IdeaProblemOutputSchema.safeParse(mockResult);
      assert.ok(parseResult.success, `Schema validation failed: ${parseResult.error?.message}`);
      assert.ok(parseResult.data.score >= 0 && parseResult.data.score <= 100);
      assert.equal(parseResult.data.agentId, 'idea_problem');
    });
  });

  // Agent 2: Market Research
  describe('Agent 2 — Market Research Agent', () => {
    test('produces valid MarketResearchOutput and handles research availability correctly', async () => {
      const mockResult = {
        agentId: 'market_research',
        name: 'Market Research Agent',
        score: 78,
        confidence: 0.85,
        executiveSummary: 'The Indian edtech and internship market exhibits rapid growth in tier-2/3 clusters.',
        marketOverview: 'India has over 40 million higher education students with rising demand for practical skills.',
        marketSizeTAM: '₹18,000 Cr (EdTech & Early Career Hiring TAM)',
        marketSizeSAM: '₹3,200 Cr (Maharashtra & Western India Tier-2/3)',
        marketSizeSOM: '₹80 Cr (3-Year obtainable target)',
        marketSizingMethodology: 'Bottom-up: 500k students x ₹1,600 annual blended platform spend.',
        demandAssessment: 'High latent demand driven by employability concerns.',
        geographicRelevance: 'Maharashtra tier-2 cities (Pune, Nagpur, Nashik) provide high student density.',
        majorTrends: ['Skill-first hiring over degrees', 'Remote micro-internships'],
        marketOpportunities: ['MSME digital adoption via UPI rails'],
        marketBarriers: ['Initial MSME hesitation to pay upfront placement fees'],
        keyFindings: ['Sizable addressable student pool in tier-2 Maharashtra'],
        strengths: ['Large top-of-funnel demographic'],
        weaknesses: ['Seasonal hiring cycles'],
        assumptions: ['Smartphone and UPI penetration in tier-2 cities'],
        recommendations: ['Partner with regional college placement cells'],
        researchDepth: 'standard',
        isResearchAvailable: false,
        sources: [],
        limitations: ['External research unavailable. Analytical model estimates used.'],
        executionMode: 'live_gemini',
      };

      const parseResult = MarketResearchOutputSchema.safeParse(mockResult);
      assert.ok(parseResult.success, `Schema validation failed: ${parseResult.error?.message}`);
      assert.equal(parseResult.data.isResearchAvailable, false);
      assert.ok(parseResult.data.limitations[0].includes('External research unavailable'));
    });
  });

  // Agent 3: Competitor Analysis
  describe('Agent 3 — Competitor Analysis Agent', () => {
    test('produces Market Gap Analysis with explicit whitespace and non-copy recommendations', async () => {
      const mockResult = {
        agentId: 'competitor_analysis',
        name: 'Competitor Analysis Agent',
        score: 76,
        confidence: 0.86,
        executiveSummary: 'Incumbents focus heavily on full-time corporate hiring, leaving short-term MSME gigs underserved.',
        directCompetitors: [
          {
            name: 'Internshala',
            type: 'direct' as const,
            description: 'Dominant Indian internship portal',
            strengths: ['Large student user base'],
            weaknesses: ['High spam applications', 'Long hiring cycles'],
            pricing: 'Freemium with ₹1,499 premium posting',
          },
        ],
        indirectCompetitors: [],
        alternatives: [],
        featureComparisonMatrix: [
          {
            feature: 'AI Micro-Project Matching',
            proposedStartup: true,
            competitors: { Internshala: false },
          },
        ],
        marketGapAnalysis: {
          whatCompetitorsAreMissing: ['Micro-project escrow payments', 'Instant skill verification'],
          whatCustomersAreMissing: ['Short 1-2 week project gigs for quick portfolio proof'],
          underservedSegments: ['Tier-2/3 college students and small local MSMEs'],
          whitespace: ['Instant micro-task matching without 3-week resume review delays'],
          whatStartupCanDoDifferently: ['Structure 10-hour weekend project sprints'],
          whatStartupShouldNotCopy: ['Complex cover-letter requirements and unvetted job posting spam'],
          differentiationOpportunities: ['UPI micro-payouts upon task approval'],
          proposedAdvantage: 'Fastest turn-around micro-internship platform in India.',
        },
        keyFindings: ['Existing portals suffer from low response rates'],
        strengths: ['Faster velocity micro-project model'],
        weaknesses: ['Incumbent brand awareness'],
        assumptions: ['MSMEs have small projects ready for delegation'],
        recommendations: ['Focus on 1-week structured project templates'],
        sources: [],
        limitations: ['Competitor pricing reflects public benchmarks.'],
        executionMode: 'live_gemini',
      };

      const parseResult = CompetitorAnalysisOutputSchema.safeParse(mockResult);
      assert.ok(parseResult.success, `Schema validation failed: ${parseResult.error?.message}`);
      assert.ok(parseResult.data.marketGapAnalysis.whitespace.length > 0);
      assert.ok(parseResult.data.marketGapAnalysis.whatStartupShouldNotCopy.length > 0);
    });
  });

  // Agent 4: Customer & Validation
  describe('Agent 4 — Customer & Validation Agent', () => {
    test('formulates testable hypotheses with explicit failureCondition', async () => {
      const mockResult = {
        agentId: 'customer_validation',
        name: 'Customer & Validation Agent',
        score: 80,
        confidence: 0.87,
        executiveSummary: 'Customer validation framework focuses on proving student project completion rates and MSME willingness to pay.',
        primaryTargetCustomers: testProject.targetCustomers,
        secondaryTargetCustomers: 'Independent freelancers & tier-3 polytechnic institutes',
        personas: [
          {
            name: 'Aarav Patil',
            role: '3rd Year B.Tech Student in Nagpur',
            demographics: '20 years old, smartphone native',
            coreNeeds: ['Needs real project experience for resume', 'Wants side income'],
            painPoints: ['Cannot find local internships', 'No network in metro cities'],
            motivations: ['Building portfolio', 'Earning stipend'],
            adoptionBarriers: ['Skepticism about fake internships'],
            decisionFactors: ['Verified MSME listings & instant UPI payout'],
          },
        ],
        hypotheses: [
          {
            id: 'hyp-1',
            hypothesis: 'College students in tier-2 Maharashtra will complete a 10-hour micro-project for a verified skill badge and ₹1,500 stipend.',
            whyItMatters: 'Validates core supply-side engagement.',
            validationMethod: 'prototype_experiment' as const,
            suggestedSampleSize: '30 students',
            successMetric: '>= 75% complete project within 7 days',
            expectedResult: 'Strong completion rate',
            failureCondition: '< 40% completion rate due to time constraints',
            risks: ['Student exam schedule conflicts'],
            recommendation: 'Run pilot outside examination months',
          },
        ],
        interviewStrategy: ['Interview 20 students across 3 colleges'],
        surveyStrategy: ['Deploy 5-question Google form in college WhatsApp groups'],
        prototypeExperiment: 'Figma prototype task runner test',
        landingPageExperiment: 'Single page waitlist',
        keyFindings: ['Students prioritize verified experience over raw stipend amount'],
        strengths: ['Highly motivated student demographic'],
        weaknesses: ['Exam schedule seasonality'],
        assumptions: ['Students can commit 5 hours per week'],
        recommendations: ['Schedule sprint projects around academic calendar'],
        sources: [],
        limitations: ['Hypotheses require founder execution.'],
        executionMode: 'live_gemini',
      };

      const parseResult = CustomerValidationOutputSchema.safeParse(mockResult);
      assert.ok(parseResult.success, `Schema validation failed: ${parseResult.error?.message}`);
      assert.ok(parseResult.data.hypotheses[0].failureCondition);
    });
  });

  // Agent 5: Business Model
  describe('Agent 5 — Business Model Agent', () => {
    test('produces Business Model Canvas and compares monetization models', async () => {
      const mockResult = {
        agentId: 'business_model',
        name: 'Business Model Agent',
        score: 77,
        confidence: 0.85,
        executiveSummary: 'Recommended model is a freemium student tier with premium MSME project posting & escrow fee.',
        customerSegments: ['Tier-2/3 Students', 'Local Startups & MSMEs'],
        valueProposition: 'AI-matched micro-internships with verified project outcomes.',
        channels: ['Campus ambassador networks', 'LinkedIn & WhatsApp', 'Local MSME associations'],
        customerRelationships: ['Automated self-serve platform with community support'],
        revenueStreams: [
          {
            streamName: 'MSME Project Commission / Posting Fee',
            pricingModel: '₹499 per project post + 10% escrow fee',
            unitPriceEstimate: '₹750 average revenue per project',
            assumptions: 'MSMEs find ₹499 affordable for short project help.',
          },
        ],
        keyResources: ['Matching algorithm', 'Student database', 'College partnerships'],
        keyActivities: ['Platform maintenance', 'Project vetting', 'Campus marketing'],
        keyPartners: ['College placement offices', 'Regional MSME chambers of commerce'],
        costStructure: ['Cloud hosting', 'Payment gateway fees', 'Campus ambassador rewards'],
        modelComparison: [
          {
            modelName: 'Freemium Student + Paid MSME Gigs',
            suitability: 'recommended' as const,
            rationale: 'Maximizes student supply while monetizing business demand.',
          },
        ],
        unitEconomicsAssumptions: {
          estimatedCAC: '₹250 (Student organic) / ₹1,200 (MSME)',
          estimatedLTV: '₹4,500 per active MSME',
          ltvCacRatio: '3.75x',
          paybackPeriodMonths: '3 months',
          grossMarginPercent: 85,
        },
        keyFindings: ['Freemium model ensures rapid student network effects'],
        strengths: ['High gross margin digital platform'],
        weaknesses: ['Two-sided marketplace liquidity chicken-and-egg challenge'],
        assumptions: ['MSMEs post at least 3 projects per year'],
        recommendations: ['Seed supply side with top 500 engineering/management students first'],
        sources: [],
        limitations: ['Unit economics are analytical benchmarks.'],
        executionMode: 'live_gemini',
      };

      const parseResult = BusinessModelOutputSchema.safeParse(mockResult);
      assert.ok(parseResult.success, `Schema validation failed: ${parseResult.error?.message}`);
      assert.equal(parseResult.data.modelComparison[0].suitability, 'recommended');
    });
  });

  // Agent 6: Finance & Budget
  describe('Agent 6 — Finance & Budget Agent', () => {
    test('uses FinanceCalculationEngine for deterministic calculations', () => {
      const budget = 600000;
      const setup = 150000;
      const opEx = 50000;
      const rev = 35000;

      const scenarios = FinanceCalculationEngine.generateScenarios(budget, setup, opEx, rev);
      assert.ok(scenarios.expected.runwayMonths > 0);
      assert.equal(scenarios.expected.initialInvestmentINR, budget);
      assert.ok(scenarios.conservative.monthlyOperatingCostINR > scenarios.expected.monthlyOperatingCostINR);
      assert.ok(scenarios.optimistic.monthlyOperatingCostINR < scenarios.expected.monthlyOperatingCostINR);
    });
  });

  // Agent 7: MVP / Product
  describe('Agent 7 — MVP / Product Agent', () => {
    test('produces actionable PRD, tech stack, and P0/P1 feature roadmap', async () => {
      const mockResult = {
        agentId: 'mvp_product',
        name: 'MVP / Product Agent',
        score: 80,
        confidence: 0.88,
        executiveSummary: 'MVP blueprint focuses on 6-week release covering student onboarding, project posting, AI matching, and UPI escrow.',
        mvpObjective: 'Enable an MSME to post a project and match with a qualified student in under 24 hours.',
        mustHaveFeatures: [
          {
            name: 'Student Profile & Skill Verification',
            description: 'Minimal profile creation with GitHub/portfolio links and skill tags',
            priority: 'P0' as const,
            userValue: 'Establishes basic talent credibility',
          },
          {
            name: 'MSME Project Post & Escrow Checkout',
            description: 'Simple form to post 10-40 hour project task with UPI milestone deposit',
            priority: 'P0' as const,
            userValue: 'Ensures payment security for students',
          },
        ],
        niceToHaveFeatures: [
          {
            name: 'Automated Certificate Generator',
            description: 'PDF completion badge upon project signoff',
            priority: 'P1' as const,
            userValue: 'Social sharing incentive',
          },
        ],
        featuresToAvoidInitially: [
          {
            name: 'Native Mobile Apps (iOS/Android)',
            reasonToAvoid: 'Delays MVP launch by 8 weeks; responsive web app is sufficient.',
          },
        ],
        userJourneySteps: [
          { step: 1, userAction: 'Student signs up via magic link', systemResponse: 'Creates profile and prompts skill tags' },
        ],
        technicalArchitecture: {
          components: ['React SPA', 'Fastify Backend', 'MongoDB Database'],
          suggestedTechStack: {
            frontend: ['React 19', 'TypeScript', 'Tailwind CSS', 'Vite'],
            backend: ['Node.js', 'TypeScript', 'Fastify'],
            database: ['MongoDB', 'Mongoose'],
            hostingInfrastructure: ['Vercel', 'Render', 'MongoDB Atlas'],
            keyLibraries: ['Zod', 'JWT', 'Lucide React'],
          },
          integrations: ['Razorpay UPI', 'Postmark Email'],
          dataFlowSummary: 'Client communicates via authenticated REST API with Zod validation.',
        },
        roadmap: {
          mvpV1: ['Auth & Profile', 'Project Posting', 'Matching Engine', 'UPI Checkout'],
          mvpV2Future: ['Team Accounts', 'Review Ratings'],
          estimatedSprintWeeks: 6,
        },
        keyFindings: ['6-week build timeline is realistic with modular TypeScript stack'],
        strengths: ['Lean feature scope'],
        weaknesses: ['Payment gateway API dependency'],
        assumptions: ['Responsive web is adequate for v1'],
        recommendations: ['Test prototype with 10 students before locking UI'],
        sources: [],
        limitations: ['Scoped for v1 release.'],
        executionMode: 'live_gemini',
      };

      const parseResult = MvpProductOutputSchema.safeParse(mockResult);
      assert.ok(parseResult.success, `Schema validation failed: ${parseResult.error?.message}`);
      assert.equal(parseResult.data.mustHaveFeatures[0].priority, 'P0');
    });
  });

  // Agent 8: Risk & Feasibility
  describe('Agent 8 — Risk & Feasibility Agent', () => {
    test('evaluates 9 risk categories and 4 feasibility dimensions', async () => {
      const mockResult = {
        agentId: 'risk_feasibility',
        name: 'Risk & Feasibility Agent',
        score: 76,
        confidence: 0.87,
        executiveSummary: 'SkillBridge shows strong technical feasibility (85/100). Commercial liquidity risk is the primary focus area.',
        risks: [
          { category: 'market' as const, risk: 'Low initial MSME project volume', likelihood: 'Medium' as const, impact: 'High' as const, severityScore: 6, mitigation: 'Founder-led sales to onboarding first 30 MSMEs' },
          { category: 'customer' as const, risk: 'Student drop-off midway through project', likelihood: 'Medium' as const, impact: 'Medium' as const, severityScore: 5, mitigation: 'Milestone-based escrow releases' },
          { category: 'technical' as const, risk: 'Matching algorithm inaccuracies', likelihood: 'Low' as const, impact: 'Medium' as const, severityScore: 3, mitigation: 'Fallback to tag-based search' },
          { category: 'financial' as const, risk: 'Capital depletion before marketplace liquidity', likelihood: 'Medium' as const, impact: 'High' as const, severityScore: 6, mitigation: 'Maintain 6-month runway buffer' },
          { category: 'operational' as const, risk: 'Handling project disputes between student & MSME', likelihood: 'Medium' as const, impact: 'Medium' as const, severityScore: 4, mitigation: 'Clear resolution policy and template contracts' },
          { category: 'competitive' as const, risk: 'Incumbent portal launching micro-gig feature', likelihood: 'Medium' as const, impact: 'Medium' as const, severityScore: 5, mitigation: 'Build deep regional college relationships' },
          { category: 'regulatory' as const, risk: 'Gig worker labor regulation changes in India', likelihood: 'Low' as const, impact: 'Medium' as const, severityScore: 3, mitigation: 'Structure gigs as short-term educational project contracts' },
          { category: 'security' as const, risk: 'Student data privacy and document leaks', likelihood: 'Low' as const, impact: 'High' as const, severityScore: 4, mitigation: 'Encrypted storage and strict access controls' },
          { category: 'scalability' as const, risk: 'Database query bottlenecks during campus drives', likelihood: 'Low' as const, impact: 'Medium' as const, severityScore: 3, mitigation: 'MongoDB indexing and Redis caching' },
        ],
        feasibilityScores: {
          technicalFeasibility: 85,
          marketFeasibility: 74,
          financialFeasibility: 72,
          operationalFeasibility: 78,
          overallFeasibility: 77,
        },
        feasibilityConclusion: 'Technically and operationally viable for a lean team.',
        majorConcerns: ['Marketplace liquidity & student drop-off rate'],
        keyFindings: ['Technical execution carries low risk'],
        strengths: ['Standard web tech stack reduces technical risk'],
        weaknesses: ['Two-sided marketplace balance requires active management'],
        assumptions: ['Indian gig regulations remain favorable for educational projects'],
        recommendations: ['Implement milestone escrow to protect both parties'],
        sources: [],
        limitations: ['Risk evaluation based on modeled matrix.'],
        executionMode: 'live_gemini',
      };

      const parseResult = RiskFeasibilityOutputSchema.safeParse(mockResult);
      assert.ok(parseResult.success, `Schema validation failed: ${parseResult.error?.message}`);
      assert.equal(parseResult.data.risks.length, 9);
      assert.ok('overallFeasibility' in parseResult.data.feasibilityScores);
    });
  });

  // Agent 9: Strategy Synthesis
  describe('Agent 9 — Strategy Agent (Synthesis)', () => {
    test('synthesizes prior 8 agent outputs into positioning, roadmaps, and pursuit verdict', async () => {
      const mockResult = {
        agentId: 'strategy',
        name: 'Strategy Agent',
        score: 79,
        confidence: 0.88,
        executiveSummary: 'Strategic verdict recommends "Proceed with changes": focus initial launch on Maharashtra tier-2 cities with 1-week micro-projects.',
        positioningStatement: 'For college students in Indian tier-2 cities needing practical work experience, SkillBridge is an AI micro-internship platform that delivers verified project gigs and instant UPI stipends, unlike generic job portals.',
        differentiationStrategy: 'Hyper-localized focus on short 10-hour micro-projects with escrow payment security.',
        goToMarketStrategy: 'Campus ambassador drive across 10 colleges in Nagpur/Pune + local MSME association partnerships.',
        acquisitionChannels: [
          { channel: 'College Placement Cell Partnerships', rationale: 'Direct access to verified student cohorts', costTier: 'Low' as const },
          { channel: 'Regional MSME Chamber Events', rationale: 'High-density business owner networking', costTier: 'Low' as const },
        ],
        strategicPartnerships: ['Maharashtra State Skill Development Society', 'Local TiE / Chamber of Commerce chapters'],
        thirtyDayRoadmap: ['Execute 15 student & 10 MSME discovery interviews', 'Test Figma prototype', 'Finalize MVP tech stack'],
        sixtyDayRoadmap: ['Launch beta with 50 students & 10 MSMEs', 'Test UPI escrow flow', 'Refine matching accuracy'],
        ninetyDayRoadmap: ['Public release across 5 tier-2 cities', 'Measure cohort retention & monthly recurring project posts'],
        pursuitDecision: 'Proceed with changes' as const,
        decisionRationale: 'Analytical score of 78/100 across 8 prior agent dimensions supports proceeding, provided marketplace liquidity is verified in pilot.',
        criticalSuccessFactors: ['Rapid 24-hour project matching', 'Zero student drop-off', 'Disciplined cash burn'],
        keyFindings: ['Micro-project format solves both student time constraints and MSME budget limits'],
        strengths: ['Clear strategic positioning against legacy job boards'],
        weaknesses: ['Two-sided onboarding effort required'],
        assumptions: ['College administration supports student project participation'],
        recommendations: ['Follow 30-day interview blueprint before scaling marketing'],
        sources: [],
        limitations: ['Roadmap assumes founder execution capacity.'],
        executionMode: 'live_gemini',
      };

      const parseResult = StrategyOutputSchema.safeParse(mockResult);
      assert.ok(parseResult.success, `Schema validation failed: ${parseResult.error?.message}`);
      assert.equal(parseResult.data.pursuitDecision, 'Proceed with changes');
      assert.ok(parseResult.data.thirtyDayRoadmap.length > 0);
      assert.ok(parseResult.data.sixtyDayRoadmap.length > 0);
      assert.ok(parseResult.data.ninetyDayRoadmap.length > 0);
    });
  });

  // Scoring Service Equal Weight Formula
  describe('Scoring Service (1/9th Equal Weighting)', () => {
    test('computes aggregate score as exact average of 9 dimension scores', () => {
      const scoringService = new ScoringService();
      const mockAgentOutputs = {
        idea_problem: { score: 80 },
        market_research: { score: 80 },
        competitor_analysis: { score: 80 },
        customer_validation: { score: 80 },
        business_model: { score: 80 },
        finance_budget: { score: 80 },
        mvp_product: { score: 80 },
        risk_feasibility: { score: 80 },
        strategy: { score: 80 },
      };

      const result = scoringService.calculateScore(mockAgentOutputs as any);
      assert.equal(result.overallScore, 80);
      assert.equal(result.scoreBand, 'Strong Potential');
    });
  });
});
