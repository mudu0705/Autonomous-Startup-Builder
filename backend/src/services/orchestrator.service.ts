import mongoose from 'mongoose';
import { ProjectModel } from '../models/Project.ts';
import { AnalysisModel, IAnalysisDocument } from '../models/Analysis.ts';
import { AgentRunModel, IAgentRunDocument } from '../models/AgentRun.ts';
import type {
  AgentId,
  AgentExecutionStatus,
  AnalysisResults,
  BaseAgentOutput,
} from '../../../shared/types/agent.ts';
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
} from '../agents/index.ts';
import { scoringService } from './scoring.service.ts';
import { researchService } from '../research/research.service.ts';
import { NotFoundError, BadRequestError } from '../utils/errors.ts';
import { logger } from '../config/logger.ts';

const PIPELINE_ORDER: AgentId[] = [
  'idea_problem',
  'market_research',
  'competitor_analysis',
  'customer_validation',
  'business_model',
  'finance_budget',
  'mvp_product',
  'risk_feasibility',
  'strategy',
];

const AGENT_NAMES: Record<AgentId, string> = {
  idea_problem: 'Idea & Problem Agent',
  market_research: 'Market Research Agent',
  competitor_analysis: 'Competitor Analysis Agent',
  customer_validation: 'Customer & Validation Agent',
  business_model: 'Business Model Agent',
  finance_budget: 'Finance & Budget Agent',
  mvp_product: 'MVP / Product Agent',
  risk_feasibility: 'Risk & Feasibility Agent',
  strategy: 'Strategy Agent',
};

export class AnalysisOrchestrator {
  /**
   * Initiates or resumes the 9-agent analysis pipeline for a project.
   * STRICT GUARD: Only starts if project.status === 'READY_FOR_ANALYSIS' or readyForAnalysis is true.
   */
  public async startOrResumeAnalysis(projectId: string, userId: string): Promise<{ analysisId: string; status: string }> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new NotFoundError('Project not found');
    }

    const project = await ProjectModel.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!project) {
      throw new NotFoundError('Project not found or unauthorized');
    }

    // Guard: Verify project has completed intake
    if (project.status === 'DRAFT' && project.intakeProgress < 100) {
      throw new BadRequestError('Cannot start analysis: Guided intake is incomplete. Please complete all required categories.');
    }

    // Find or create Analysis document
    let analysis = await AnalysisModel.findOne({
      projectId: project._id,
    }).sort({ version: -1 });

    if (!analysis || analysis.status === 'completed') {
      const nextVersion = analysis ? analysis.version + 1 : 1;
      analysis = await AnalysisModel.create({
        projectId: project._id,
        version: nextVersion,
        status: 'in_progress',
        progressPercent: 0,
        currentAgent: 'idea_problem',
        metadata: {
          startedBy: userId,
          projectName: project.name,
        },
      });

      // Initialize pending AgentRun documents for all 9 agents
      for (const agentId of PIPELINE_ORDER) {
        await AgentRunModel.create({
          analysisId: analysis._id,
          agentId,
          status: 'pending',
          retryCount: 0,
        });
      }

      logger.info('Created new analysis session', { projectId, analysisId: analysis._id.toString(), version: nextVersion });
    } else {
      analysis.status = 'in_progress';
      await analysis.save();
      logger.info('Resuming existing analysis session', { projectId, analysisId: analysis._id.toString() });
    }

    // Update project status to ANALYSIS_RUNNING
    await ProjectModel.updateOne(
      { _id: project._id },
      { $set: { status: 'ANALYSIS_RUNNING' } }
    );

    // Launch pipeline execution asynchronously
    const analysisIdStr = analysis._id.toString();
    this.executePipelineAsync(project, analysisIdStr).catch((err) => {
      logger.error('Unhandled pipeline execution error', {
        projectId,
        analysisId: analysisIdStr,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    return {
      analysisId: analysisIdStr,
      status: 'in_progress',
    };
  }

  /**
   * Internal asynchronous coordinator executing all 9 agents in logical order with resume capability.
   */
  private async executePipelineAsync(project: any, analysisIdStr: string): Promise<void> {
    const analysisId = new mongoose.Types.ObjectId(analysisIdStr);
    const accumulatedOutputs: Record<string, BaseAgentOutput> = {};

    // 1. Preload any already completed runs to enable resuming without rerunning
    const existingCompleted = await AgentRunModel.find({
      analysisId,
      status: 'completed',
    });

    for (const run of existingCompleted) {
      if (run.outputPayload) {
        accumulatedOutputs[run.agentId] = run.outputPayload as BaseAgentOutput;
      }
    }

    const totalAgents = PIPELINE_ORDER.length;

    for (let i = 0; i < totalAgents; i++) {
      const agentId = PIPELINE_ORDER[i];

      // Check if already completed in a previous attempt
      if (accumulatedOutputs[agentId]) {
        logger.debug('Agent already completed, skipping for resume', { agentId, analysisId: analysisIdStr });
        continue;
      }

      // Update Analysis state
      const currentProgress = Math.round((Object.keys(accumulatedOutputs).length / totalAgents) * 100);
      await AnalysisModel.updateOne(
        { _id: analysisId },
        {
          $set: {
            currentAgent: agentId,
            progressPercent: currentProgress,
          },
        }
      );

      // Fetch or init AgentRun record
      let agentRun = await AgentRunModel.findOne({ analysisId, agentId });
      if (!agentRun) {
        agentRun = await AgentRunModel.create({ analysisId, agentId, status: 'pending', retryCount: 0 });
      }

      agentRun.status = 'running';
      agentRun.startedAt = new Date();
      await agentRun.save();

      const startTime = Date.now();
      let output: BaseAgentOutput | null = null;
      let executionError: string | null = null;

      // Execute agent with safe retry
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          switch (agentId) {
            case 'idea_problem':
              output = await runIdeaProblemAgent(project, analysisIdStr);
              break;
            case 'market_research':
              output = await runMarketResearchAgent(project, analysisIdStr);
              break;
            case 'competitor_analysis':
              output = await runCompetitorAnalysisAgent(project, analysisIdStr);
              break;
            case 'customer_validation':
              output = await runCustomerValidationAgent(project, analysisIdStr);
              break;
            case 'business_model':
              output = await runBusinessModelAgent(project, analysisIdStr);
              break;
            case 'finance_budget':
              output = await runFinanceBudgetAgent(project, analysisIdStr);
              break;
            case 'mvp_product':
              output = await runMvpProductAgent(project, analysisIdStr);
              break;
            case 'risk_feasibility':
              output = await runRiskFeasibilityAgent(project, analysisIdStr);
              break;
            case 'strategy':
              output = await runStrategyAgent(project, accumulatedOutputs, analysisIdStr);
              break;
          }

          if (output) {
            break; // Success!
          }
        } catch (err) {
          executionError = err instanceof Error ? err.message : 'Unknown execution failure';
          logger.warn(`Agent ${agentId} attempt ${attempt} failed`, { error: executionError });
          if (attempt === 1) {
            agentRun.status = 'retrying';
            agentRun.retryCount += 1;
            await agentRun.save();
          }
        }
      }

      const durationMs = Date.now() - startTime;

      if (output) {
        agentRun.status = 'completed';
        agentRun.completedAt = new Date();
        agentRun.durationMs = durationMs;
        agentRun.outputPayload = output as unknown as Record<string, unknown>;
        agentRun.error = undefined;
        await agentRun.save();

        accumulatedOutputs[agentId] = output;
        logger.info(`Agent ${agentId} completed successfully in ${durationMs}ms`, { analysisId: analysisIdStr });
      } else {
        // Record failure safely without crashing pipeline
        agentRun.status = 'failed';
        agentRun.completedAt = new Date();
        agentRun.durationMs = durationMs;
        agentRun.error = executionError || 'Failed to complete agent execution after retries';
        await agentRun.save();

        await AnalysisModel.updateOne(
          { _id: analysisId },
          { $set: { status: 'failed', metadata: { failedAgent: agentId, error: agentRun.error } } }
        );

        logger.error(`Pipeline halted due to failure in agent ${agentId}`, { analysisId: analysisIdStr });
        return;
      }
    }

    // 2. All 9 Agents Completed! Finalize Analysis and calculate scores
    const calculatedScore = scoringService.calculateScore(accumulatedOutputs as any);
    await scoringService.persistScore(analysisIdStr, calculatedScore);

    // Save final Analysis state
    await AnalysisModel.updateOne(
      { _id: analysisId },
      {
        $set: {
          status: 'completed',
          progressPercent: 100,
          currentAgent: undefined,
          metadata: {
            overallScore: calculatedScore.overallScore,
            scoreBand: calculatedScore.scoreBand,
            verdict: calculatedScore.verdict,
            completedAt: new Date(),
          },
        },
      }
    );

    // Update parent project document
    await ProjectModel.updateOne(
      { _id: project._id },
      {
        $set: {
          status: 'ANALYSIS_COMPLETED',
          score: calculatedScore.overallScore,
        },
      }
    );

    logger.info('Analysis pipeline successfully finished all 9 agents!', {
      projectId: project._id.toString(),
      analysisId: analysisIdStr,
      overallScore: calculatedScore.overallScore,
    });
  }

  /**
   * Retrieves real-time pipeline status, progress percent, and agent-by-agent states.
   */
  public async getAnalysisStatus(projectId: string, userId: string): Promise<{
    analysisId: string | null;
    status: string;
    progressPercent: number;
    currentAgent?: string;
    agents: Array<{
      id: AgentId;
      name: string;
      status: AgentExecutionStatus;
      score?: number;
      durationMs?: number;
      error?: string;
    }>;
  }> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new NotFoundError('Project not found');
    }

    const project = await ProjectModel.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!project) {
      throw new NotFoundError('Project not found or unauthorized');
    }

    const analysis = await AnalysisModel.findOne({
      projectId: project._id,
    }).sort({ version: -1 });

    if (!analysis) {
      return {
        analysisId: null,
        status: project.status === 'READY_FOR_ANALYSIS' ? 'ready_to_start' : 'not_started',
        progressPercent: 0,
        agents: PIPELINE_ORDER.map((id) => ({
          id,
          name: AGENT_NAMES[id],
          status: 'pending',
        })),
      };
    }

    const agentRuns = await AgentRunModel.find({
      analysisId: analysis._id,
    });

    const runMap = new Map<string, IAgentRunDocument>();
    agentRuns.forEach((r) => runMap.set(r.agentId, r));

    const agentStatuses = PIPELINE_ORDER.map((id) => {
      const run = runMap.get(id);
      return {
        id,
        name: AGENT_NAMES[id],
        status: (run ? run.status : 'pending') as AgentExecutionStatus,
        score: run?.outputPayload ? (run.outputPayload as any).score : undefined,
        durationMs: run?.durationMs,
        error: run?.error,
      };
    });

    return {
      analysisId: analysis._id.toString(),
      status: analysis.status,
      progressPercent: analysis.progressPercent,
      currentAgent: analysis.currentAgent,
      agents: agentStatuses,
    };
  }

  /**
   * Retrieves complete structured results of all 9 agents, scores, hypotheses, and sources.
   */
  public async getAnalysisResults(projectId: string, userId: string): Promise<AnalysisResults> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new NotFoundError('Project not found');
    }

    const project = await ProjectModel.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!project) {
      throw new NotFoundError('Project not found or unauthorized');
    }

    const analysis = await AnalysisModel.findOne({
      projectId: project._id,
      status: 'completed',
    }).sort({ version: -1 });

    if (!analysis) {
      throw new NotFoundError('No completed analysis found for this project.');
    }

    const agentRuns = await AgentRunModel.find({
      analysisId: analysis._id,
      status: 'completed',
    });

    const agentsMap: Record<string, any> = {};
    let totalDurationMs = 0;

    agentRuns.forEach((r) => {
      if (r.outputPayload) {
        agentsMap[r.agentId] = r.outputPayload;
        totalDurationMs += r.durationMs || 0;
      }
    });

    // Score synthesis
    const calculated = scoringService.calculateScore(agentsMap as any);
    const allSources = await researchService.getSourcesForAnalysis(analysis._id.toString());

    return {
      analysisId: analysis._id.toString(),
      projectId: project._id.toString(),
      version: analysis.version,
      completedAt: analysis.updatedAt.toISOString(),
      durationMs: totalDurationMs,
      agents: agentsMap as any,
      overallScore: calculated.overallScore,
      scoreBand: calculated.scoreBand,
      decisionVerdict: calculated.verdict,
      validationHypotheses: agentsMap.customer_validation?.hypotheses || [],
      topRecommendations: calculated.topRecommendations,
      strengths: calculated.strengths,
      weaknesses: calculated.weaknesses,
      allSources,
    };
  }
}

export const orchestrator = new AnalysisOrchestrator();
