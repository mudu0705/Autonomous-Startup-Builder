import type { FastifyPluginAsync } from 'fastify';
import { orchestrator } from '../../services/orchestrator.service.ts';
import { scenarioService } from '../../services/scenario.service.ts';
import { reportService } from '../../services/report.service.ts';
import { requireAuth } from '../../middleware/auth.middleware.ts';
import { sendSuccess } from '../../utils/response.ts';
import { z } from 'zod';

const WhatIfInputSchema = z.object({
  title: z.string().optional(),
  scenarioType: z.enum(['conservative', 'moderate', 'aggressive', 'custom']).optional(),
  changes: z.object({
    budgetINR: z.number().optional(),
    monthlyOpExINR: z.number().optional(),
    pricingINR: z.number().optional(),
    expectedUsersMonth12: z.number().optional(),
    targetCustomerAdjustment: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const analysisRoutes: FastifyPluginAsync = async (fastify) => {
  // All analysis routes require authenticated user
  fastify.addHook('preHandler', requireAuth());

  /**
   * POST /api/projects/:id/analyze
   * Initiates or resumes the 9-agent analysis pipeline.
   */
  fastify.post<{ Params: { id: string } }>('/analyze', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const result = await orchestrator.startOrResumeAnalysis(request.params.id, request.user.userId);
    return sendSuccess(reply, result, 202);
  });

  /**
   * GET /api/projects/:id/status
   * Real-time polling endpoint reporting overall progress and agent-by-agent status.
   */
  fastify.get<{ Params: { id: string } }>('/status', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const statusData = await orchestrator.getAnalysisStatus(request.params.id, request.user.userId);
    return sendSuccess(reply, statusData, 200);
  });

  /**
   * GET /api/projects/:id/results
   * Returns consolidated results of all 9 agents, scores, hypotheses, and citations.
   */
  fastify.get<{ Params: { id: string } }>('/results', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const results = await orchestrator.getAnalysisResults(request.params.id, request.user.userId);
    return sendSuccess(reply, results, 200);
  });

  /**
   * GET /api/projects/:id/agents
   * Lists status and durations of all 9 agents for the project.
   */
  fastify.get<{ Params: { id: string } }>('/agents', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const statusData = await orchestrator.getAnalysisStatus(request.params.id, request.user.userId);
    return sendSuccess(reply, statusData.agents, 200);
  });

  /**
   * GET /api/projects/:id/agents/:agent
   * Retrieves specific agent detailed output payload.
   */
  fastify.get<{ Params: { id: string; agent: string } }>('/agents/:agent', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const results = await orchestrator.getAnalysisResults(request.params.id, request.user.userId);
    const agentOutput = (results.agents as any)[request.params.agent];

    if (!agentOutput) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Agent output for '${request.params.agent}' not found.` },
      });
    }

    return sendSuccess(reply, agentOutput, 200);
  });

  /**
   * GET /api/projects/:id/scores
   * Retrieves 9 dimension scores, score band, verdict, and AI decision summary.
   */
  fastify.get<{ Params: { id: string } }>('/scores', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const results = await orchestrator.getAnalysisResults(request.params.id, request.user.userId);
    return sendSuccess(reply, {
      overallScore: results.overallScore,
      scoreBand: results.scoreBand,
      decisionVerdict: results.decisionVerdict,
      dimensions: Object.entries(results.agents).map(([id, val]: [string, any]) => ({
        agentId: id,
        score: val?.score,
        confidence: val?.confidence,
      })),
      disclaimer: 'This score is a structured assessment based on the system analysis, assumptions, and available evidence. It is not a prediction or guarantee of actual startup success.',
    }, 200);
  });

  /**
   * POST /api/projects/:id/scenarios
   * Simulates What-If assumption adjustments without overwriting original analysis.
   */
  fastify.post<{ Params: { id: string } }>('/scenarios', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const parsed = WhatIfInputSchema.parse(request.body);
    const comparison = await scenarioService.createWhatIfScenario(
      request.params.id,
      request.user.userId,
      parsed
    );

    return sendSuccess(reply, comparison, 201);
  });

  /**
   * GET /api/projects/:id/scenarios
   * Lists all saved What-If scenarios for the project.
   */
  fastify.get<{ Params: { id: string } }>('/scenarios', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const list = await scenarioService.getScenarios(request.params.id, request.user.userId);
    return sendSuccess(reply, list, 200);
  });

  /**
   * GET /api/projects/:id/report
   * Retrieves the comprehensive 26-section Startup Blueprint.
   */
  fastify.get<{ Params: { id: string } }>('/report', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const blueprint = await reportService.generateBlueprint(request.params.id, request.user.userId);
    return sendSuccess(reply, blueprint, 200);
  });

  /**
   * GET /api/projects/:id/report/pdf
   * Returns print-ready styled HTML blueprint for clean browser PDF export.
   */
  fastify.get<{ Params: { id: string } }>('/report/pdf', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const html = await reportService.generateHtmlReport(request.params.id, request.user.userId);
    reply.type('text/html');
    return reply.send(html);
  });
};
