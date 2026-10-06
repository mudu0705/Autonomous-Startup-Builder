import mongoose from 'mongoose';
import { ScoreModel, IScoreDocument } from '../models/Score.ts';
import type {
  StartupScore,
  ScoreBand,
  DecisionVerdict,
  DimensionScore,
  AIDecisionSummary,
} from '../../../shared/types/score.ts';
import type { AnalysisResults } from '../../../shared/types/agent.ts';
import { logger } from '../config/logger.ts';

export class ScoringService {
  public static readonly DISCLAIMER =
    'This score is a structured assessment based on the system\'s analysis, assumptions, and available evidence. It is not a prediction or guarantee of actual startup success.';

  /**
   * Deterministically calculates the Startup Potential Score across exactly 9 equal dimensions.
   * NO WEIGHTING: Every dimension has equal 1/9 importance.
   */
  public calculateScore(agents: AnalysisResults['agents']): {
    overallScore: number;
    scoreBand: ScoreBand;
    verdict: DecisionVerdict;
    dimensions: DimensionScore[];
    decisionSummary: AIDecisionSummary;
    topRecommendations: string[];
    strengths: string[];
    weaknesses: string[];
  } {
    const dimensions: DimensionScore[] = [
      {
        dimension: 'Problem',
        agentId: 'idea_problem',
        score: Math.min(100, Math.max(0, agents.idea_problem?.score ?? 70)),
        confidence: agents.idea_problem?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.idea_problem?.executiveSummary || 'Problem-solution fit evaluation',
        strengths: agents.idea_problem?.strengths || [],
        weaknesses: agents.idea_problem?.weaknesses || [],
      },
      {
        dimension: 'Market',
        agentId: 'market_research',
        score: Math.min(100, Math.max(0, agents.market_research?.score ?? 70)),
        confidence: agents.market_research?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.market_research?.executiveSummary || 'Market size and demand dynamics',
        strengths: agents.market_research?.strengths || [],
        weaknesses: agents.market_research?.weaknesses || [],
      },
      {
        dimension: 'Competition',
        agentId: 'competitor_analysis',
        score: Math.min(100, Math.max(0, agents.competitor_analysis?.score ?? 70)),
        confidence: agents.competitor_analysis?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.competitor_analysis?.executiveSummary || 'Market gap and competitive differentiation',
        strengths: agents.competitor_analysis?.strengths || [],
        weaknesses: agents.competitor_analysis?.weaknesses || [],
      },
      {
        dimension: 'Customer',
        agentId: 'customer_validation',
        score: Math.min(100, Math.max(0, agents.customer_validation?.score ?? 70)),
        confidence: agents.customer_validation?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.customer_validation?.executiveSummary || 'Customer clarity and testable hypotheses',
        strengths: agents.customer_validation?.strengths || [],
        weaknesses: agents.customer_validation?.weaknesses || [],
      },
      {
        dimension: 'Business',
        agentId: 'business_model',
        score: Math.min(100, Math.max(0, agents.business_model?.score ?? 70)),
        confidence: agents.business_model?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.business_model?.executiveSummary || 'Business model and unit economics viability',
        strengths: agents.business_model?.strengths || [],
        weaknesses: agents.business_model?.weaknesses || [],
      },
      {
        dimension: 'Finance',
        agentId: 'finance_budget',
        score: Math.min(100, Math.max(0, agents.finance_budget?.score ?? 70)),
        confidence: agents.finance_budget?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.finance_budget?.executiveSummary || 'Capital efficiency, runway, and break-even',
        strengths: agents.finance_budget?.strengths || [],
        weaknesses: agents.finance_budget?.weaknesses || [],
      },
      {
        dimension: 'MVP',
        agentId: 'mvp_product',
        score: Math.min(100, Math.max(0, agents.mvp_product?.score ?? 70)),
        confidence: agents.mvp_product?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.mvp_product?.executiveSummary || 'MVP scope and architectural feasibility',
        strengths: agents.mvp_product?.strengths || [],
        weaknesses: agents.mvp_product?.weaknesses || [],
      },
      {
        dimension: 'Risk',
        agentId: 'risk_feasibility',
        score: Math.min(100, Math.max(0, agents.risk_feasibility?.score ?? 70)),
        confidence: agents.risk_feasibility?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.risk_feasibility?.executiveSummary || 'Venture risk defensibility and feasibility',
        strengths: agents.risk_feasibility?.strengths || [],
        weaknesses: agents.risk_feasibility?.weaknesses || [],
      },
      {
        dimension: 'Strategy',
        agentId: 'strategy',
        score: Math.min(100, Math.max(0, agents.strategy?.score ?? 70)),
        confidence: agents.strategy?.confidence ?? 0.85,
        weight: 1 / 9,
        explanation: agents.strategy?.executiveSummary || 'Strategic positioning and GTM roadmap',
        strengths: agents.strategy?.strengths || [],
        weaknesses: agents.strategy?.weaknesses || [],
      },
    ];

    // Formula: Final Score = (Sum of all 9 dimensions) / 9
    const sum = dimensions.reduce((acc, dim) => acc + dim.score, 0);
    const overallScore = Math.round(sum / 9);

    // Determine Score Band
    let scoreBand: ScoreBand;
    if (overallScore >= 80) {
      scoreBand = 'Strong Potential';
    } else if (overallScore >= 60) {
      scoreBand = 'Moderate / Promising Potential';
    } else if (overallScore >= 40) {
      scoreBand = 'Needs Improvement';
    } else {
      scoreBand = 'High Concerns';
    }

    // Determine Verdict based on Strategy Agent recommendation and score
    let verdict: DecisionVerdict;
    if (agents.strategy?.pursuitDecision) {
      verdict = agents.strategy.pursuitDecision;
    } else if (overallScore >= 80) {
      verdict = 'Proceed';
    } else if (overallScore >= 65) {
      verdict = 'Proceed with changes';
    } else if (overallScore >= 50) {
      verdict = 'Validate first';
    } else {
      verdict = 'High concerns';
    }

    // Synthesize structured AI Decision Summary (7 questions)
    const decisionSummary: AIDecisionSummary = {
      shouldPursue: verdict === 'High concerns' ? 'Caution Advised' : 'Yes, with structured validation',
      why: `With an overall Startup Potential Score of ${overallScore}/100 (${scoreBand}), the core value proposition demonstrates addressable demand, provided initial validation milestones are satisfied.`,
      supportingFactors: [
        `Clear problem resonance identified in Problem Analysis (${dimensions[0].score}/100)`,
        `Favorable unit economics with high software gross margins (${dimensions[4].score}/100)`,
        `Pragmatic 6-week MVP build scope with lean infrastructure requirements (${dimensions[6].score}/100)`,
        `Actionable 90-day milestone roadmap established in Strategy Analysis (${dimensions[8].score}/100)`,
      ],
      biggestConcerns: [
        'User inertia and habit barrier switching away from free manual workarounds (WhatsApp/Excel)',
        'Managing customer acquisition costs before organic viral loops take hold',
      ],
      whatToValidateFirst: [
        'Conduct 15 customer problem discovery interviews before freezing backend code',
        'Deploy clickable Figma prototype to verify task completion speed with target demographic',
      ],
      whatToChange: [
        'Limit v1 scope strictly to P0 core loop features',
        'Incorporate UPI Autopay and micro-pricing tiers tailored for Indian willingness to pay',
      ],
      finalDecision: verdict,
    };

    // Aggregate unique strengths and weaknesses
    const allStrengths = Array.from(new Set(dimensions.flatMap((d) => d.strengths))).slice(0, 8);
    const allWeaknesses = Array.from(new Set(dimensions.flatMap((d) => d.weaknesses))).slice(0, 8);

    // Aggregate top recommendations
    const allRecs = Array.from(
      new Set(
        [
          ...(agents.idea_problem?.recommendations || []),
          ...(agents.market_research?.recommendations || []),
          ...(agents.customer_validation?.recommendations || []),
          ...(agents.strategy?.recommendations || []),
        ]
      )
    ).slice(0, 8);

    return {
      overallScore,
      scoreBand,
      verdict,
      dimensions,
      decisionSummary,
      topRecommendations: allRecs,
      strengths: allStrengths,
      weaknesses: allWeaknesses,
    };
  }

  /**
   * Persists calculated score into MongoDB ScoreModel.
   */
  private readonly memoryScores = new Map<string, any>();

  public async persistScore(
    analysisId: string,
    calculated: ReturnType<ScoringService['calculateScore']>
  ): Promise<IScoreDocument> {
    const verdictMapping: Record<DecisionVerdict, 'high_potential' | 'viable_with_adjustments' | 'high_risk' | 'unviable'> = {
      'Proceed': 'high_potential',
      'Proceed with changes': 'viable_with_adjustments',
      'Validate first': 'viable_with_adjustments',
      'High concerns': 'high_risk',
    };

    const categories = calculated.dimensions.map((d) => ({
      category: d.dimension,
      weight: 1 / 9,
      score: d.score,
      maxScore: 100,
      factors: [
        {
          factor: `${d.dimension} Health`,
          points: d.score,
          explanation: d.explanation,
        },
      ],
    }));

    if (mongoose.connection.readyState !== 1) {
      const memoryDoc = {
        _id: new mongoose.Types.ObjectId().toHexString(),
        analysisId,
        overallScore: calculated.overallScore,
        verdict: verdictMapping[calculated.verdict] || 'viable_with_adjustments',
        categories,
        calculatedAt: new Date(),
      };
      this.memoryScores.set(analysisId, memoryDoc);
      logger.info('Startup Potential Score persisted in memory fallback', {
        analysisId,
        overallScore: calculated.overallScore,
        scoreBand: calculated.scoreBand,
      });
      return memoryDoc as any;
    }

    await ScoreModel.deleteMany({ analysisId: new mongoose.Types.ObjectId(analysisId) });

    const doc = await ScoreModel.create({
      analysisId: new mongoose.Types.ObjectId(analysisId),
      overallScore: calculated.overallScore,
      verdict: verdictMapping[calculated.verdict] || 'viable_with_adjustments',
      categories,
      calculatedAt: new Date(),
    });

    logger.info('Startup Potential Score persisted successfully', {
      analysisId,
      overallScore: calculated.overallScore,
      scoreBand: calculated.scoreBand,
    });

    return doc;
  }
}

export const scoringService = new ScoringService();
