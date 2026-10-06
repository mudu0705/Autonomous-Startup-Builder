import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.ts';
import { JwtTokenManager, jwtTokenManager } from '../src/auth/jwt.manager.ts';
import { AuthService } from '../src/auth/auth.service.ts';
import { argon2Hasher } from '../src/auth/argon2.hasher.ts';
import { UserModel } from '../src/models/User.ts';
import { ProjectModel } from '../src/models/Project.ts';
import { AnalysisModel } from '../src/models/Analysis.ts';
import { AgentRunModel } from '../src/models/AgentRun.ts';

import { FinanceCalculationEngine } from '../src/services/finance.engine.ts';
import { ScoringService } from '../src/services/scoring.service.ts';

// ==========================================
// HELPERS
// ==========================================

/** Builds a minimal mock agent output satisfying the 9-agent schema. */
function makeMockAgentOutput(score: number) {
  return {
    score,
    confidence: 0.9,
    executiveSummary: `Mock summary (score=${score})`,
    strengths: [`Strength at ${score}`],
    weaknesses: [`Weakness at ${score}`],
    recommendations: [`Recommendation at ${score}`],
  };
}

/** Builds a full 9-agent result map with configurable per-agent scores. */
function makeAgents(scores: {
  idea_problem?: number;
  market_research?: number;
  competitor_analysis?: number;
  customer_validation?: number;
  business_model?: number;
  finance_budget?: number;
  mvp_product?: number;
  risk_feasibility?: number;
  strategy?: number;
} = {}) {
  return {
    idea_problem: makeMockAgentOutput(scores.idea_problem ?? 70),
    market_research: makeMockAgentOutput(scores.market_research ?? 70),
    competitor_analysis: makeMockAgentOutput(scores.competitor_analysis ?? 70),
    customer_validation: makeMockAgentOutput(scores.customer_validation ?? 70),
    business_model: makeMockAgentOutput(scores.business_model ?? 70),
    finance_budget: makeMockAgentOutput(scores.finance_budget ?? 70),
    mvp_product: makeMockAgentOutput(scores.mvp_product ?? 70),
    risk_feasibility: makeMockAgentOutput(scores.risk_feasibility ?? 70),
    strategy: makeMockAgentOutput(scores.strategy ?? 70),
  };
}

// ==========================================
// SUITE 1: Finance Calculation Engine (Pure Arithmetic)
// ==========================================

describe('Phase 3-9 – Finance Calculation Engine (Deterministic Arithmetic)', () => {
  // ---- calculateRunway ----
  describe('FinanceCalculationEngine.calculateRunway()', () => {
    test('returns correct runway months with positive burn rate', () => {
      const cash = 500_000;   // ₹5 lakh
      const burn = 50_000;    // ₹50k / month
      const runway = FinanceCalculationEngine.calculateRunway(cash, burn);
      // Expected: 500000 / 50000 = 10, rounded to 1 decimal
      assert.equal(runway, 10);
    });

    test('returns 99 when burn is zero (profitable / self-sustaining)', () => {
      const runway = FinanceCalculationEngine.calculateRunway(1_000_000, 0);
      assert.equal(runway, 99);
    });

    test('returns 99 when burn is negative (cash-flow positive)', () => {
      const runway = FinanceCalculationEngine.calculateRunway(1_000_000, -5_000);
      assert.equal(runway, 99);
    });

    test('returns 0 when cash available is zero or negative', () => {
      assert.equal(FinanceCalculationEngine.calculateRunway(0, 30_000), 0);
      assert.equal(FinanceCalculationEngine.calculateRunway(-1, 30_000), 0);
    });

    test('rounds to one decimal place correctly', () => {
      // 100000 / 30000 = 3.333... → 3.3
      const runway = FinanceCalculationEngine.calculateRunway(100_000, 30_000);
      assert.equal(runway, 3.3);
    });
  });

  // ---- calculateTwelveMonthMetrics ----
  describe('FinanceCalculationEngine.calculateTwelveMonthMetrics()', () => {
    const budget = 1_000_000;
    const setup = 200_000;
    const opEx = 60_000;
    const startingRev = 40_000;
    const growthRate = 0.15;

    let metrics: ReturnType<typeof FinanceCalculationEngine.calculateTwelveMonthMetrics>;

    before(() => {
      metrics = FinanceCalculationEngine.calculateTwelveMonthMetrics(
        budget,
        setup,
        opEx,
        startingRev,
        growthRate
      );
    });

    test('generates exactly 12 monthly entries', () => {
      assert.equal(metrics.length, 12);
    });

    test('each month entry has correct shape (month, revenue, expenses, netIncome, cashRemaining, burnRate)', () => {
      for (const m of metrics) {
        assert.ok(typeof m.month === 'number');
        assert.ok(typeof m.revenue === 'number');
        assert.ok(typeof m.expenses === 'number');
        assert.ok(typeof m.netIncome === 'number');
        assert.ok(typeof m.cashRemaining === 'number');
        assert.ok(typeof m.burnRate === 'number');
      }
    });

    test('month numbers run 1 through 12 in order', () => {
      metrics.forEach((m, idx) => {
        assert.equal(m.month, idx + 1);
      });
    });

    test('month 1 uses ramp-up revenue (20% of startingMonthlyRevenue)', () => {
      const expectedM1Rev = Math.round(startingRev * 0.2);
      assert.equal(metrics[0].revenue, expectedM1Rev);
    });

    test('netIncome = revenue - expenses for every month', () => {
      for (const m of metrics) {
        assert.equal(m.netIncome, m.revenue - m.expenses);
      }
    });

    test('burnRate is non-negative for every month', () => {
      for (const m of metrics) {
        assert.ok(m.burnRate >= 0, `Month ${m.month} burnRate is negative: ${m.burnRate}`);
      }
    });

    test('cashRemaining is non-negative for every month', () => {
      for (const m of metrics) {
        assert.ok(m.cashRemaining >= 0, `Month ${m.month} cashRemaining is negative: ${m.cashRemaining}`);
      }
    });

    test('initial cash = startingBudget - initialSetupCosts = 800,000', () => {
      // After setup costs, starting cash = 1,000,000 - 200,000 = 800,000
      // Month 1 netIncome is applied on top of that, so cashRemaining[0] = 800000 + netIncome[0]
      const expectedStartingCash = budget - setup; // 800_000
      const expectedM1Cash = Math.max(0, expectedStartingCash + metrics[0].netIncome);
      assert.equal(metrics[0].cashRemaining, expectedM1Cash);
    });

    test('generates deterministic results on repeated calls', () => {
      const second = FinanceCalculationEngine.calculateTwelveMonthMetrics(
        budget, setup, opEx, startingRev, growthRate
      );
      assert.deepEqual(metrics, second);
    });
  });

  // ---- generateScenarios ----
  describe('FinanceCalculationEngine.generateScenarios()', () => {
    const budget = 800_000;
    const setup = 150_000;
    const opEx = 50_000;
    const rev = 30_000;

    let scenarios: ReturnType<typeof FinanceCalculationEngine.generateScenarios>;

    before(() => {
      scenarios = FinanceCalculationEngine.generateScenarios(budget, setup, opEx, rev);
    });

    test('returns all three scenario keys: conservative, expected, optimistic', () => {
      assert.ok('conservative' in scenarios);
      assert.ok('expected' in scenarios);
      assert.ok('optimistic' in scenarios);
    });

    test('conservative has higher monthlyOperatingCostINR than expected', () => {
      assert.ok(
        scenarios.conservative.monthlyOperatingCostINR > scenarios.expected.monthlyOperatingCostINR,
        'Conservative OpEx should be higher than expected OpEx'
      );
    });

    test('optimistic has lower monthlyOperatingCostINR than expected', () => {
      assert.ok(
        scenarios.optimistic.monthlyOperatingCostINR < scenarios.expected.monthlyOperatingCostINR,
        'Optimistic OpEx should be lower than expected OpEx'
      );
    });

    test('conservative has lower expectedMonthlyRevenueINR than expected', () => {
      assert.ok(
        scenarios.conservative.expectedMonthlyRevenueINR < scenarios.expected.expectedMonthlyRevenueINR,
        'Conservative revenue should be lower than expected revenue'
      );
    });

    test('optimistic has higher expectedMonthlyRevenueINR than expected', () => {
      assert.ok(
        scenarios.optimistic.expectedMonthlyRevenueINR > scenarios.expected.expectedMonthlyRevenueINR,
        'Optimistic revenue should be higher than expected revenue'
      );
    });

    test('all scenarios share the same initialInvestmentINR', () => {
      assert.equal(scenarios.conservative.initialInvestmentINR, budget);
      assert.equal(scenarios.expected.initialInvestmentINR, budget);
      assert.equal(scenarios.optimistic.initialInvestmentINR, budget);
    });
  });
});

// ==========================================
// SUITE 2: Scoring Service (Deterministic Score Formula)
// ==========================================

describe('Phase 3-9 – ScoringService (Equal 1/9th Weight Formula)', () => {
  const scoringService = new ScoringService();

  test('overallScore = Math.round(sum of 9 dimension scores / 9)', () => {
    const agents = makeAgents({
      idea_problem: 90,
      market_research: 80,
      competitor_analysis: 70,
      customer_validation: 60,
      business_model: 50,
      finance_budget: 40,
      mvp_product: 30,
      risk_feasibility: 20,
      strategy: 10,
    });

    const result = scoringService.calculateScore(agents as any);
    const expectedSum = 90 + 80 + 70 + 60 + 50 + 40 + 30 + 20 + 10; // 450
    const expectedOverall = Math.round(expectedSum / 9); // 50
    assert.equal(result.overallScore, expectedOverall);
  });

  test('all 9 dimensions have equal weight of 1/9', () => {
    const agents = makeAgents();
    const result = scoringService.calculateScore(agents as any);
    assert.equal(result.dimensions.length, 9);
    for (const dim of result.dimensions) {
      const expected = 1 / 9;
      assert.ok(
        Math.abs(dim.weight - expected) < 1e-12,
        `Dimension "${dim.dimension}" weight ${dim.weight} ≠ 1/9 (${expected})`
      );
    }
  });

  test('uniform scores produce overallScore = that score', () => {
    const agents = makeAgents({
      idea_problem: 75,
      market_research: 75,
      competitor_analysis: 75,
      customer_validation: 75,
      business_model: 75,
      finance_budget: 75,
      mvp_product: 75,
      risk_feasibility: 75,
      strategy: 75,
    });
    const result = scoringService.calculateScore(agents as any);
    assert.equal(result.overallScore, 75);
  });

  // ---- Score Band tests ----
  describe('Score band mapping', () => {
    test('score 80+ maps to "Strong Potential"', () => {
      const agents = makeAgents({
        idea_problem: 90, market_research: 90, competitor_analysis: 90,
        customer_validation: 90, business_model: 90, finance_budget: 90,
        mvp_product: 90, risk_feasibility: 90, strategy: 90,
      });
      const { scoreBand } = scoringService.calculateScore(agents as any);
      assert.equal(scoreBand, 'Strong Potential');
    });

    test('score 60-79 maps to "Moderate / Promising Potential"', () => {
      // All 65 → sum = 585 → 585/9 = 65
      const agents = makeAgents({
        idea_problem: 65, market_research: 65, competitor_analysis: 65,
        customer_validation: 65, business_model: 65, finance_budget: 65,
        mvp_product: 65, risk_feasibility: 65, strategy: 65,
      });
      const { scoreBand } = scoringService.calculateScore(agents as any);
      assert.equal(scoreBand, 'Moderate / Promising Potential');
    });

    test('score 40-59 maps to "Needs Improvement"', () => {
      // All 50 → overall = 50
      const agents = makeAgents({
        idea_problem: 50, market_research: 50, competitor_analysis: 50,
        customer_validation: 50, business_model: 50, finance_budget: 50,
        mvp_product: 50, risk_feasibility: 50, strategy: 50,
      });
      const { scoreBand } = scoringService.calculateScore(agents as any);
      assert.equal(scoreBand, 'Needs Improvement');
    });

    test('score 0-39 maps to "High Concerns"', () => {
      // All 30 → overall = 30
      const agents = makeAgents({
        idea_problem: 30, market_research: 30, competitor_analysis: 30,
        customer_validation: 30, business_model: 30, finance_budget: 30,
        mvp_product: 30, risk_feasibility: 30, strategy: 30,
      });
      const { scoreBand } = scoringService.calculateScore(agents as any);
      assert.equal(scoreBand, 'High Concerns');
    });

    test('boundary: score exactly 80 is "Strong Potential"', () => {
      const agents = makeAgents({
        idea_problem: 80, market_research: 80, competitor_analysis: 80,
        customer_validation: 80, business_model: 80, finance_budget: 80,
        mvp_product: 80, risk_feasibility: 80, strategy: 80,
      });
      const { scoreBand, overallScore } = scoringService.calculateScore(agents as any);
      assert.equal(overallScore, 80);
      assert.equal(scoreBand, 'Strong Potential');
    });

    test('boundary: score exactly 60 is "Moderate / Promising Potential"', () => {
      const agents = makeAgents({
        idea_problem: 60, market_research: 60, competitor_analysis: 60,
        customer_validation: 60, business_model: 60, finance_budget: 60,
        mvp_product: 60, risk_feasibility: 60, strategy: 60,
      });
      const { scoreBand, overallScore } = scoringService.calculateScore(agents as any);
      assert.equal(overallScore, 60);
      assert.equal(scoreBand, 'Moderate / Promising Potential');
    });

    test('boundary: score exactly 40 is "Needs Improvement"', () => {
      const agents = makeAgents({
        idea_problem: 40, market_research: 40, competitor_analysis: 40,
        customer_validation: 40, business_model: 40, finance_budget: 40,
        mvp_product: 40, risk_feasibility: 40, strategy: 40,
      });
      const { scoreBand, overallScore } = scoringService.calculateScore(agents as any);
      assert.equal(overallScore, 40);
      assert.equal(scoreBand, 'Needs Improvement');
    });
  });

  // ---- LLM does NOT calculate the final score ----
  test('LLM does not determine final score – overallScore is server-calculated Math.round(sum/9)', () => {
    // This test verifies that the server-side ScoringService.calculateScore() deterministically
    // applies the formula rather than delegating to any LLM call.
    // We test this by directly calling calculateScore() and confirming it equals the expected arithmetic.
    const scores = [82, 78, 74, 70, 66, 62, 58, 54, 50];
    const agents: any = {};
    const agentIds = [
      'idea_problem', 'market_research', 'competitor_analysis', 'customer_validation',
      'business_model', 'finance_budget', 'mvp_product', 'risk_feasibility', 'strategy',
    ];
    agentIds.forEach((id, i) => {
      agents[id] = makeMockAgentOutput(scores[i]);
    });

    const result = scoringService.calculateScore(agents);
    const expectedOverall = Math.round(scores.reduce((a, b) => a + b, 0) / 9);
    // 82+78+74+70+66+62+58+54+50 = 594 → 594/9 = 66
    assert.equal(result.overallScore, expectedOverall);
    // No external calls needed – this is pure server-side arithmetic
  });

  // ---- Missing agents fall back to 70 ----
  test('missing agent scores fall back to 70 for that dimension', () => {
    // Pass empty agents object – all should default to 70
    const result = scoringService.calculateScore({} as any);
    assert.equal(result.overallScore, 70); // all 9 dimensions default to 70 → 630/9 = 70
    assert.equal(result.dimensions.length, 9);
    for (const dim of result.dimensions) {
      assert.equal(dim.score, 70);
    }
  });

  // ---- Score clamping ----
  test('scores above 100 are clamped to 100', () => {
    const agents = makeAgents({
      idea_problem: 150,
      market_research: 200,
      competitor_analysis: 999,
      customer_validation: 100,
      business_model: 100,
      finance_budget: 100,
      mvp_product: 100,
      risk_feasibility: 100,
      strategy: 100,
    });
    const result = scoringService.calculateScore(agents as any);
    // Clamped: all become 100 → overall = 100
    assert.equal(result.overallScore, 100);
    for (const dim of result.dimensions) {
      assert.ok(dim.score <= 100, `Dimension score ${dim.score} exceeds 100`);
    }
  });

  test('scores below 0 are clamped to 0', () => {
    const agents = makeAgents({
      idea_problem: -10,
      market_research: -50,
      competitor_analysis: 0,
      customer_validation: 0,
      business_model: 0,
      finance_budget: 0,
      mvp_product: 0,
      risk_feasibility: 0,
      strategy: 0,
    });
    const result = scoringService.calculateScore(agents as any);
    for (const dim of result.dimensions) {
      assert.ok(dim.score >= 0, `Dimension score ${dim.score} is below 0`);
    }
    assert.equal(result.overallScore, 0);
  });

  // ---- Return shape ----
  test('calculateScore returns all required fields', () => {
    const result = scoringService.calculateScore(makeAgents() as any);
    assert.ok('overallScore' in result);
    assert.ok('scoreBand' in result);
    assert.ok('verdict' in result);
    assert.ok('dimensions' in result);
    assert.ok('decisionSummary' in result);
    assert.ok('topRecommendations' in result);
    assert.ok('strengths' in result);
    assert.ok('weaknesses' in result);
  });
});

// ==========================================
// SUITE 3: Analysis API Routes (Fastify inject)
// ==========================================

describe('Phase 3-9 – Analysis API Routes', () => {
  let mongod: MongoMemoryServer;
  let app: FastifyInstance;
  let tokenManager: JwtTokenManager;
  let authService: AuthService;

  let userToken: string;
  let userId: string;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    tokenManager = jwtTokenManager;
    authService = new AuthService(argon2Hasher, tokenManager);

    app = await buildApp();
  });

  after(async () => {
    await app.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await ProjectModel.deleteMany({});
    await UserModel.deleteMany({});
    await AnalysisModel.deleteMany({});
    await AgentRunModel.deleteMany({});

    const session = await authService.register({
      email: 'analyst@startup.io',
      password: 'Password123!',
      fullName: 'Analyst User',
    });
    userToken = session.token;
    userId = session.user.id;
  });

  // ---- POST /api/projects/:id/analyze ----
  describe('POST /api/projects/:id/analyze', () => {
    test('returns 404 when project does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${fakeId}/analyze`,
        headers: { authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.statusCode, 404);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, false);
    });

    test('returns 401 when no auth token provided', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${fakeId}/analyze`,
      });
      assert.equal(res.statusCode, 401);
    });

    test('returns 404 for a project owned by another user', async () => {
      // Create a second user and their project
      const otherSession = await authService.register({
        email: 'other@startup.io',
        password: 'Password123!',
      });

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${otherSession.token}` },
        payload: {
          name: 'Other Project',
          startupIdea: 'Other user startup idea description text',
        },
      });
      const projectId = JSON.parse(createRes.payload).data.id;

      // Try to analyze with first user's token
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/analyze`,
        headers: { authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.statusCode, 404);
    });

    test('regression: accepts POST with empty JSON object {} and application/json header', async () => {
      // Create user project marked ready for analysis
      const project = await ProjectModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        name: 'Ready Project',
        startupIdea: 'AI personalized study planner for students',
        status: 'READY_FOR_ANALYSIS',
        intakeProgress: 100,
        location: { country: 'India', scope: 'national', locations: [] },
        budget: { amount: 500000, currency: 'INR', source: 'USER', isCertain: true },
        analysisDepth: 'standard',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${project._id.toString()}/analyze`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: {},
      });

      assert.equal(res.statusCode, 202);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, true);
      assert.ok(body.data.analysisId);
      assert.equal(body.data.status, 'in_progress');
    });

    test('regression: accepts POST without body and without Content-Type header', async () => {
      const project = await ProjectModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        name: 'Ready Project No Body',
        startupIdea: 'AI personalized study planner for students',
        status: 'READY_FOR_ANALYSIS',
        intakeProgress: 100,
        location: { country: 'India', scope: 'national', locations: [] },
        budget: { amount: 500000, currency: 'INR', source: 'USER', isCertain: true },
        analysisDepth: 'standard',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${project._id.toString()}/analyze`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      assert.equal(res.statusCode, 202);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, true);
      assert.ok(body.data.analysisId);
    });

    test('regression: handles empty string body with application/json safely without crashing', async () => {
      const project = await ProjectModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        name: 'Ready Project Empty String Body',
        startupIdea: 'AI personalized study planner for students',
        status: 'READY_FOR_ANALYSIS',
        intakeProgress: 100,
        location: { country: 'India', scope: 'national', locations: [] },
        budget: { amount: 500000, currency: 'INR', source: 'USER', isCertain: true },
        analysisDepth: 'standard',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${project._id.toString()}/analyze`,
        headers: {
          authorization: `Bearer ${userToken}`,
          'content-type': 'application/json',
        },
        payload: '',
      });

      // Should succeed with 202 or return handled 400, never uncaught FST_ERR_CTP_EMPTY_JSON_BODY 500
      assert.ok(res.statusCode === 202 || res.statusCode === 400);
      const body = JSON.parse(res.payload);
      if (res.statusCode === 202) {
        assert.equal(body.success, true);
        assert.ok(body.data.analysisId);
      }
    });
  });

  // ---- GET /api/projects/:id/status ----
  describe('GET /api/projects/:id/status', () => {
    test('returns status for an existing project that has no analysis yet', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          name: 'My Status Project',
          startupIdea: 'A startup idea description for status test',
        },
      });
      const projectId = JSON.parse(createRes.payload).data.id;

      const statusRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/status`,
        headers: { authorization: `Bearer ${userToken}` },
      });

      assert.equal(statusRes.statusCode, 200);
      const body = JSON.parse(statusRes.payload);
      assert.equal(body.success, true);
      // analysisId should be null when no analysis has been started
      assert.equal(body.data.analysisId, null);
    });

    test('returns 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects/${fakeId}/status`,
        headers: { authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.statusCode, 404);
    });

    test('returns 401 when no auth token provided', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'GET',
        url: `/api/projects/${fakeId}/status`,
      });
      assert.equal(res.statusCode, 401);
    });
  });

  // ---- POST /api/projects/:id/scenarios ----
  describe('POST /api/projects/:id/scenarios', () => {
    test('returns 404 when project has no completed analysis', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          name: 'Scenario Test Project',
          startupIdea: 'A startup idea for scenario testing purposes',
        },
      });
      const projectId = JSON.parse(createRes.payload).data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/scenarios`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          changes: { budgetINR: 600_000 },
        },
      });

      // No completed analysis → orchestrator.getAnalysisResults throws NotFoundError → 404
      assert.equal(res.statusCode, 404);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, false);
    });

    test('returns 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${fakeId}/scenarios`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          changes: { budgetINR: 500_000 },
        },
      });
      assert.equal(res.statusCode, 404);
    });

    test('returns 401 when no auth token provided', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await app.inject({
        method: 'POST',
        url: `/api/projects/${fakeId}/scenarios`,
        payload: { changes: { budgetINR: 500_000 } },
      });
      assert.equal(res.statusCode, 401);
    });
  });

  // ---- GET /api/projects/:id/results ----
  describe('GET /api/projects/:id/results', () => {
    test('returns 404 when project has no completed analysis', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/projects',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          name: 'Results Test Project',
          startupIdea: 'A startup idea for results endpoint testing',
        },
      });
      const projectId = JSON.parse(createRes.payload).data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/projects/${projectId}/results`,
        headers: { authorization: `Bearer ${userToken}` },
      });

      assert.equal(res.statusCode, 404);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, false);
    });
  });
});

// ==========================================
// SUITE 4: Admin API Routes (RBAC Enforcement)
// ==========================================

describe('Phase 3-9 – Admin API Routes (RBAC)', () => {
  let mongod: MongoMemoryServer;
  let app: FastifyInstance;
  let tokenManager: JwtTokenManager;
  let authService: AuthService;

  let userToken: string;
  let adminToken: string;

  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());

    tokenManager = jwtTokenManager;
    authService = new AuthService(argon2Hasher, tokenManager);

    app = await buildApp();
  });

  after(async () => {
    await app.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});

    // Regular user
    const session = await authService.register({
      email: 'regularuser@startup.io',
      password: 'Password123!',
      fullName: 'Regular User',
    });
    userToken = session.token;

    // Admin user (directly created with role: 'admin')
    const adminDoc = await UserModel.create({
      email: 'admin@startup.io',
      passwordHash: 'hashed_irrelevant',
      fullName: 'Admin User',
      role: 'admin',
      status: 'active',
    });
    adminToken = tokenManager.sign({
      userId: adminDoc._id.toString(),
      email: adminDoc.email,
      role: 'admin',
    });
  });

  // ---- GET /api/admin/metrics ----
  describe('GET /api/admin/metrics', () => {
    test('returns 403 for regular (non-admin) user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/metrics',
        headers: { authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.statusCode, 403);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, false);
    });

    test('returns 401 for unauthenticated request', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/metrics',
      });
      assert.equal(res.statusCode, 401);
    });

    test('admin user can access /api/admin/metrics and receives 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/metrics',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, true);
    });
  });

  // ---- GET /api/admin/health ----
  describe('GET /api/admin/health', () => {
    test('returns 403 for regular (non-admin) user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/health',
        headers: { authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.statusCode, 403);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, false);
    });

    test('returns 401 for unauthenticated request', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/health',
      });
      assert.equal(res.statusCode, 401);
    });

    test('admin user can access /api/admin/health and receives 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/health',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, true);
    });
  });

  // ---- GET /api/admin/users ----
  describe('GET /api/admin/users', () => {
    test('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.statusCode, 403);
    });

    test('admin can list users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.users));
    });
  });

  // ---- GET /api/admin/projects ----
  describe('GET /api/admin/projects', () => {
    test('returns 403 for non-admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/projects',
        headers: { authorization: `Bearer ${userToken}` },
      });
      assert.equal(res.statusCode, 403);
    });

    test('admin can list all projects', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/projects',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.equal(body.success, true);
    });
  });
});
