import mongoose from 'mongoose';
import { ProjectModel } from '../models/Project.ts';
import { AnalysisModel } from '../models/Analysis.ts';
import { ScenarioModel, IScenarioDocument } from '../models/Scenario.ts';
import { orchestrator } from './orchestrator.service.ts';
import { FinanceCalculationEngine } from './finance.engine.ts';
import type {
  ScenarioComparison,
  ScenarioAssumptionChanges,
  DimensionScoreDelta,
  ScenarioType,
} from '../../../shared/types/scenario.ts';
import { NotFoundError, BadRequestError } from '../utils/errors.ts';
import { logger } from '../config/logger.ts';

export class ScenarioService {
  /**
   * Simulates a What-If scenario against a completed analysis without altering the baseline data.
   */
  public async createWhatIfScenario(
    projectId: string,
    userId: string,
    params: {
      title?: string;
      scenarioType?: ScenarioType;
      changes: ScenarioAssumptionChanges;
    }
  ): Promise<ScenarioComparison> {
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

    // Get original completed analysis results
    const originalResults = await orchestrator.getAnalysisResults(projectId, userId);
    const analysisId = new mongoose.Types.ObjectId(originalResults.analysisId);

    const title = params.title || `What-If Scenario (${new Date().toLocaleDateString()})`;
    const scenarioType: ScenarioType = params.scenarioType || 'custom';
    const changes = params.changes;

    // 1. Identify baseline financial parameters
    const originalFinance = originalResults.agents.finance_budget;
    const origBudget = originalFinance?.startingBudgetINR || 500000;
    const origSetup = originalFinance?.initialSetupCosts.reduce((a, b) => a + b.amountINR, 0) || Math.round(origBudget * 0.25);
    const origOpEx = originalFinance?.monthlyOperatingCosts.reduce((a, b) => a + b.amountINR, 0) || 50000;
    const origMonthlyRev = originalFinance?.scenarios.expected.expectedMonthlyRevenueINR || 35000;

    // 2. Apply simulated adjustments
    const newBudget = changes.budgetINR !== undefined ? Math.max(10000, changes.budgetINR) : origBudget;
    const newOpEx = changes.monthlyOpExINR !== undefined ? Math.max(5000, changes.monthlyOpExINR) : origOpEx;
    const newMonthlyRev = changes.pricingINR !== undefined
      ? Math.round((changes.pricingINR * (changes.expectedUsersMonth12 || 100)) / 12)
      : origMonthlyRev;

    // 3. Deterministically recompute financial metrics via calculation engine
    const newScenarios = FinanceCalculationEngine.generateScenarios(
      newBudget,
      Math.round(origSetup * (newBudget / origBudget)),
      newOpEx,
      newMonthlyRev
    );

    // 4. Dependency-Aware Score Adjustments
    // Dimensions affected: Finance (direct), MVP (scope constrained by budget), Strategy (runway viability)
    const dimensionChanges: DimensionScoreDelta[] = [];

    // Baseline dimension scores
    const origScores = {
      Problem: originalResults.agents.idea_problem?.score || 75,
      Market: originalResults.agents.market_research?.score || 72,
      Competition: originalResults.agents.competitor_analysis?.score || 74,
      Customer: originalResults.agents.customer_validation?.score || 76,
      Business: originalResults.agents.business_model?.score || 75,
      Finance: originalResults.agents.finance_budget?.score || 74,
      MVP: originalResults.agents.mvp_product?.score || 78,
      Risk: originalResults.agents.risk_feasibility?.score || 75,
      Strategy: originalResults.agents.strategy?.score || 76,
    };

    // Calculate delta for Finance based on new runway and break-even
    const runwayDeltaMonths = newScenarios.expected.runwayMonths - (originalFinance?.cashRunwayMonths || 6);
    let financeDelta = Math.round(runwayDeltaMonths * 2.5);
    if (newScenarios.expected.breakEvenMonth && newScenarios.expected.breakEvenMonth <= 6) financeDelta += 5;
    const newFinanceScore = Math.min(100, Math.max(30, origScores.Finance + financeDelta));

    dimensionChanges.push({
      dimension: 'Finance',
      originalScore: origScores.Finance,
      scenarioScore: newFinanceScore,
      delta: newFinanceScore - origScores.Finance,
      rationale: `Runway shifted by ${runwayDeltaMonths > 0 ? '+' : ''}${runwayDeltaMonths.toFixed(1)} months under revised capital/cost assumptions.`,
    });

    // MVP score adjustment (if budget cut significantly, MVP score adjusts for budget stress)
    let mvpDelta = 0;
    if (newBudget < origBudget * 0.6) {
      mvpDelta = -6;
    } else if (newBudget > origBudget * 1.4) {
      mvpDelta = +4;
    }
    const newMvpScore = Math.min(100, Math.max(30, origScores.MVP + mvpDelta));
    dimensionChanges.push({
      dimension: 'MVP',
      originalScore: origScores.MVP,
      scenarioScore: newMvpScore,
      delta: mvpDelta,
      rationale: mvpDelta < 0
        ? 'Capital constraints may require deselecting secondary features from v1.'
        : 'Expanded budget enables faster sprint velocity and parallel engineering.',
    });

    // Strategy score adjustment
    const strategyDelta = Math.round((financeDelta + mvpDelta) / 2);
    const newStrategyScore = Math.min(100, Math.max(30, origScores.Strategy + strategyDelta));
    dimensionChanges.push({
      dimension: 'Strategy',
      originalScore: origScores.Strategy,
      scenarioScore: newStrategyScore,
      delta: strategyDelta,
      rationale: 'Strategic execution risk is tightly linked to financial runway and product delivery speed.',
    });

    // Unaltered dimensions
    const finalDimensions = {
      ...origScores,
      Finance: newFinanceScore,
      MVP: newMvpScore,
      Strategy: newStrategyScore,
    };

    // Compute new overall score strictly using equal 1/9th weights
    const newSum = Object.values(finalDimensions).reduce((a, b) => a + b, 0);
    const newOverallScore = Math.round(newSum / 9);

    const getBand = (score: number) => {
      if (score >= 80) return 'Strong Potential';
      if (score >= 60) return 'Moderate / Promising Potential';
      if (score >= 40) return 'Needs Improvement';
      return 'High Concerns';
    };

    const newScoreBand = getBand(newOverallScore);
    const origScoreBand = getBand(originalResults.overallScore);

    // Contextual recommendations
    const recommendations: string[] = [];
    if (newBudget < origBudget) {
      recommendations.push(`Under reduced budget of ₹${newBudget.toLocaleString()}, restrict MVP strictly to P0 core loops and rely on founder-led sales.`);
    } else if (newBudget > origBudget) {
      recommendations.push(`With increased budget of ₹${newBudget.toLocaleString()}, allocate surplus capital into customer discovery testing rather than premature office space.`);
    }
    if (newOpEx < origOpEx) {
      recommendations.push(`Optimized monthly OpEx of ₹${newOpEx.toLocaleString()} extends runway to ${newScenarios.expected.runwayMonths.toFixed(1)} months.`);
    }
    recommendations.push('Re-verify unit economics with 15 customer discovery interviews before committing capital.');

    // 5. Persist Scenario Document
    const calculatedMetrics = newScenarios.expected.twelveMonthRevenueINR > 0
      ? FinanceCalculationEngine.calculateTwelveMonthMetrics(newBudget, Math.round(origSetup * (newBudget / origBudget)), newOpEx, newMonthlyRev, 0.15).map((m) => ({
          ...m,
          cashRunwayMonths: FinanceCalculationEngine.calculateRunway(m.cashRemaining, m.burnRate),
        }))
      : [];

    const scenarioDoc = await ScenarioModel.create({
      analysisId,
      type: scenarioType,
      title,
      assumptions: [
        `Starting Budget: ₹${newBudget.toLocaleString()} INR (Orig: ₹${origBudget.toLocaleString()})`,
        `Monthly OpEx: ₹${newOpEx.toLocaleString()} INR (Orig: ₹${origOpEx.toLocaleString()})`,
        changes.notes ? `User Note: ${changes.notes}` : 'Simulated assumption modification',
      ],
      metrics: calculatedMetrics,
      projectedBreakEvenMonth: newScenarios.expected.breakEvenMonth || undefined,
    });

    const comparison: ScenarioComparison = {
      scenarioId: scenarioDoc._id.toString(),
      analysisId: originalResults.analysisId,
      title,
      scenarioType,
      assumptionsChanged: changes,
      originalFinalScore: originalResults.overallScore,
      scenarioFinalScore: newOverallScore,
      originalScoreBand: origScoreBand,
      scenarioScoreBand: newScoreBand,
      dimensionChanges,
      financialImpact: {
        originalRunwayMonths: originalFinance?.cashRunwayMonths || 6,
        scenarioRunwayMonths: newScenarios.expected.runwayMonths,
        originalBreakEvenMonth: originalFinance?.breakEvenMonth || null,
        scenarioBreakEvenMonth: newScenarios.expected.breakEvenMonth,
        originalTwelveMonthProfit: originalFinance?.scenarios.expected.twelveMonthProfitINR || 0,
        scenarioTwelveMonthProfit: newScenarios.expected.twelveMonthProfitINR,
      },
      recommendations,
      createdAt: scenarioDoc.createdAt.toISOString(),
    };

    logger.info('What-If scenario generated successfully', {
      projectId,
      scenarioId: scenarioDoc._id.toString(),
      originalScore: originalResults.overallScore,
      scenarioScore: newOverallScore,
    });

    return comparison;
  }

  /**
   * Retrieves all saved scenarios for an analysis.
   */
  public async getScenarios(projectId: string, userId: string): Promise<any[]> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return [];
    }

    const project = await ProjectModel.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!project) {
      throw new NotFoundError('Project not found or unauthorized');
    }

    const analysis = await AnalysisModel.findOne({ projectId: project._id, status: 'completed' }).sort({ version: -1 });
    if (!analysis) {
      return [];
    }

    const docs = await ScenarioModel.find({ analysisId: analysis._id }).sort({ createdAt: -1 }).lean();
    return docs.map((d: any) => ({
      id: d._id.toString(),
      analysisId: d.analysisId.toString(),
      type: d.type,
      title: d.title,
      assumptions: d.assumptions,
      projectedBreakEvenMonth: d.projectedBreakEvenMonth,
      createdAt: d.createdAt,
    }));
  }
}

export const scenarioService = new ScenarioService();
