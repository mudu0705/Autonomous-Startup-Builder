import mongoose from 'mongoose';
import { ProjectModel } from '../models/Project.ts';
import { AnalysisModel } from '../models/Analysis.ts';
import { ReportModel, IReportDocument } from '../models/Report.ts';
import { orchestrator } from './orchestrator.service.ts';
import type {
  StartupBlueprint,
  ReportSection,
  ExecutiveReport,
} from '../../../shared/types/report.ts';
import { NotFoundError } from '../utils/errors.ts';
import { logger } from '../config/logger.ts';

export class ReportService {
  /**
   * Compiles the 26-section consolidated Startup Blueprint from completed analysis data.
   */
  public async generateBlueprint(projectId: string, userId: string): Promise<StartupBlueprint> {
    const results = await orchestrator.getAnalysisResults(projectId, userId);
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const { agents, overallScore, scoreBand, decisionVerdict, allSources, validationHypotheses, topRecommendations } = results;

    const sections: ReportSection[] = [
      {
        number: 1,
        title: 'Executive Summary',
        summary: `Strategic overview of ${project.name}: rated ${overallScore}/100 (${scoreBand}). Verdict: ${decisionVerdict}.`,
        content: agents.strategy?.executiveSummary || 'Venture analysis synthesis complete.',
      },
      {
        number: 2,
        title: 'Startup Idea & Core Concept',
        summary: 'Underlying venture concept and primary hypothesis.',
        content: project.startupIdea,
      },
      {
        number: 3,
        title: 'Problem & Root Cause Analysis',
        agentId: 'idea_problem',
        summary: 'Assessment of user pain severity and current workarounds.',
        content: {
          problemStatement: agents.idea_problem?.problemStatement,
          rootCauses: agents.idea_problem?.rootCauses,
          painPoints: agents.idea_problem?.painPoints,
          currentAlternatives: agents.idea_problem?.currentAlternatives,
        },
      },
      {
        number: 4,
        title: 'Proposed Solution & Value Proposition',
        agentId: 'idea_problem',
        summary: 'Evaluation of the proposed product mechanism.',
        content: {
          proposedSolution: project.proposedSolution || agents.idea_problem?.proposedSolution,
          valueProposition: agents.idea_problem?.valueProposition,
          fitAssessment: agents.idea_problem?.problemSolutionFit,
        },
      },
      {
        number: 5,
        title: 'Target Customers & Segmentation',
        agentId: 'customer_validation',
        summary: 'Primary and secondary target customer cohorts in India.',
        content: {
          primaryAudience: project.targetCustomers || agents.customer_validation?.primaryTargetCustomers,
          secondaryAudience: agents.customer_validation?.secondaryTargetCustomers,
        },
      },
      {
        number: 6,
        title: 'Launch Geography & Regional Suitability',
        agentId: 'market_research',
        summary: `Geographic focus: ${project.location?.country || 'India'} (${project.location?.scope || 'national'}).`,
        content: {
          location: project.location,
          geographicRelevance: agents.market_research?.geographicRelevance,
        },
      },
      {
        number: 7,
        title: 'Market Research & Demand Assessment',
        agentId: 'market_research',
        summary: 'TAM/SAM/SOM sizing and growth indicators in India.',
        content: {
          overview: agents.market_research?.marketOverview,
          tam: agents.market_research?.marketSizeTAM,
          sam: agents.market_research?.marketSizeSAM,
          som: agents.market_research?.marketSizeSOM,
          methodology: agents.market_research?.marketSizingMethodology,
          trends: agents.market_research?.majorTrends,
          opportunities: agents.market_research?.marketOpportunities,
          barriers: agents.market_research?.marketBarriers,
        },
      },
      {
        number: 8,
        title: 'Competitor Analysis & Landscape',
        agentId: 'competitor_analysis',
        summary: 'Direct, indirect, and status-quo competitors.',
        content: {
          directCompetitors: agents.competitor_analysis?.directCompetitors,
          indirectCompetitors: agents.competitor_analysis?.indirectCompetitors,
          alternatives: agents.competitor_analysis?.alternatives,
          featureMatrix: agents.competitor_analysis?.featureComparisonMatrix,
        },
      },
      {
        number: 9,
        title: 'Market Gap & Unmet Needs',
        agentId: 'competitor_analysis',
        summary: 'Specific whitespace opportunities for the proposed startup.',
        content: agents.competitor_analysis?.marketGapAnalysis || {},
      },
      {
        number: 10,
        title: 'Customer Analysis & Personas',
        agentId: 'customer_validation',
        summary: 'Detailed customer personas and decision drivers.',
        content: agents.customer_validation?.personas || [],
      },
      {
        number: 11,
        title: 'Customer Validation Plan & Hypotheses',
        agentId: 'customer_validation',
        summary: 'Structured Lean validation experiments.',
        content: {
          hypotheses: validationHypotheses,
          interviewStrategy: agents.customer_validation?.interviewStrategy,
          surveyStrategy: agents.customer_validation?.surveyStrategy,
          prototypeExperiment: agents.customer_validation?.prototypeExperiment,
          landingPageExperiment: agents.customer_validation?.landingPageExperiment,
        },
      },
      {
        number: 12,
        title: 'Business Model & Revenue Architecture',
        agentId: 'business_model',
        summary: 'Commercial model, pricing tiers, and unit economics.',
        content: {
          revenueStreams: agents.business_model?.revenueStreams,
          modelComparison: agents.business_model?.modelComparison,
          unitEconomics: agents.business_model?.unitEconomicsAssumptions,
          channels: agents.business_model?.channels,
          keyPartners: agents.business_model?.keyPartners,
        },
      },
      {
        number: 13,
        title: 'Finance, Runway & Capital Allocation',
        agentId: 'finance_budget',
        summary: `Starting capital: ₹${agents.finance_budget?.startingBudgetINR.toLocaleString()} INR, Runway: ${agents.finance_budget?.cashRunwayMonths} months.`,
        content: {
          budget: agents.finance_budget?.startingBudgetINR,
          budgetSource: agents.finance_budget?.budgetSource,
          initialSetupCosts: agents.finance_budget?.initialSetupCosts,
          monthlyOpEx: agents.finance_budget?.monthlyOperatingCosts,
          scenarios: agents.finance_budget?.scenarios,
          budgetAllocation: agents.finance_budget?.budgetAllocationBreakdown,
          formulas: agents.finance_budget?.deterministicFormulasUsed,
        },
      },
      {
        number: 14,
        title: 'MVP & Product Specification',
        agentId: 'mvp_product',
        summary: 'Lean product requirements, P0 features, and architecture.',
        content: {
          mvpObjective: agents.mvp_product?.mvpObjective,
          mustHaveFeatures: agents.mvp_product?.mustHaveFeatures,
          featuresToAvoid: agents.mvp_product?.featuresToAvoidInitially,
          techStack: agents.mvp_product?.technicalArchitecture.suggestedTechStack,
          roadmap: agents.mvp_product?.roadmap,
        },
      },
      {
        number: 15,
        title: 'Risk Assessment & Vulnerability Matrix',
        agentId: 'risk_feasibility',
        summary: 'Identified risks across market, operational, technical, and financial vectors.',
        content: agents.risk_feasibility?.risks || [],
      },
      {
        number: 16,
        title: 'Feasibility Conclusion',
        agentId: 'risk_feasibility',
        summary: 'Technical, market, operational, and financial feasibility ratings.',
        content: {
          scores: agents.risk_feasibility?.feasibilityScores,
          conclusion: agents.risk_feasibility?.feasibilityConclusion,
          majorConcerns: agents.risk_feasibility?.majorConcerns,
        },
      },
      {
        number: 17,
        title: 'Commercial Strategy & Positioning',
        agentId: 'strategy',
        summary: 'Strategic positioning and defensible differentiation.',
        content: {
          positioningStatement: agents.strategy?.positioningStatement,
          differentiation: agents.strategy?.differentiationStrategy,
          criticalSuccessFactors: agents.strategy?.criticalSuccessFactors,
        },
      },
      {
        number: 18,
        title: 'Go-to-Market & Acquisition Plan',
        agentId: 'strategy',
        summary: 'Initial customer acquisition channels and ecosystem partnerships.',
        content: {
          gtmStrategy: agents.strategy?.goToMarketStrategy,
          channels: agents.strategy?.acquisitionChannels,
          partnerships: agents.strategy?.strategicPartnerships,
        },
      },
      {
        number: 19,
        title: '30 / 60 / 90 Day Execution Roadmap',
        agentId: 'strategy',
        summary: 'Phased timeline for discovery, beta testing, and public release.',
        content: {
          thirtyDays: agents.strategy?.thirtyDayRoadmap,
          sixtyDays: agents.strategy?.sixtyDayRoadmap,
          ninetyDays: agents.strategy?.ninetyDayRoadmap,
        },
      },
      {
        number: 20,
        title: 'Actionable Venture Recommendations',
        summary: 'Prioritized tactical action items for the founding team.',
        content: topRecommendations,
      },
      {
        number: 21,
        title: 'Nine Dimension Venture Ratings',
        summary: 'Individual 0–100 scores with equal 1/9th weights.',
        content: [
          { dimension: 'Problem', score: agents.idea_problem?.score },
          { dimension: 'Market', score: agents.market_research?.score },
          { dimension: 'Competition', score: agents.competitor_analysis?.score },
          { dimension: 'Customer', score: agents.customer_validation?.score },
          { dimension: 'Business', score: agents.business_model?.score },
          { dimension: 'Finance', score: agents.finance_budget?.score },
          { dimension: 'MVP', score: agents.mvp_product?.score },
          { dimension: 'Risk', score: agents.risk_feasibility?.score },
          { dimension: 'Strategy', score: agents.strategy?.score },
        ],
      },
      {
        number: 22,
        title: 'Final Startup Potential Score',
        summary: `Consolidated Score: ${overallScore}/100 (${scoreBand}).`,
        content: {
          overallScore,
          scoreBand,
          formula: 'Equal unweighted average of 9 specialized agent scores: (Problem + Market + Competition + Customer + Business + Finance + MVP + Risk + Strategy) / 9',
        },
      },
      {
        number: 23,
        title: 'AI Decision Summary',
        agentId: 'strategy',
        summary: `Strategic verdict: ${decisionVerdict}.`,
        content: {
          decision: decisionVerdict,
          rationale: agents.strategy?.decisionRationale,
          strengths: results.strengths,
          weaknesses: results.weaknesses,
        },
      },
      {
        number: 24,
        title: 'Documented Assumptions & Provenance',
        summary: 'Distinction between User Provided, AI Estimated, and Model Assumptions.',
        content: {
          ideaProblemAssumptions: agents.idea_problem?.assumptions,
          marketAssumptions: agents.market_research?.assumptions,
          businessAssumptions: agents.business_model?.assumptions,
          financeAssumptions: agents.finance_budget?.assumptions,
        },
      },
      {
        number: 25,
        title: 'Research Citations & Evidence Library',
        summary: `${allSources.length} external sources verified during research phases.`,
        content: allSources,
      },
      {
        number: 26,
        title: 'Academic Prototype Disclaimer',
        summary: 'Standard venture decision-support analytical limitations.',
        content: 'This score and blueprint is a structured analytical assessment based on the Autonomous Startup Builder decision-support platform, modeled assumptions, and available evidence. It is created for academic major project demonstration and does not constitute guaranteed business success or professional legal/financial counsel.',
      },
    ];

    const blueprint: StartupBlueprint = {
      id: `bp_${results.analysisId}`,
      analysisId: results.analysisId,
      projectId: results.projectId,
      startupName: project.name || 'Startup Blueprint',
      generatedAt: new Date().toISOString(),
      overallScore,
      scoreBand,
      decisionVerdict,
      sections,
      disclaimer: sections[25].content as string,
      pdfExportUrl: `/api/projects/${projectId}/report/pdf`,
    };

    // Upsert to ReportModel
    await ReportModel.deleteMany({ analysisId: new mongoose.Types.ObjectId(results.analysisId) });
    await ReportModel.create({
      analysisId: new mongoose.Types.ObjectId(results.analysisId),
      title: `${project.name || 'Startup'} Blueprint`,
      executiveSummary: sections[0].content as string,
      sections: sections.slice(0, 10).map((s) => ({
        title: s.title,
        agentId: s.agentId || 'system',
        summary: s.summary,
        keyFindings: Array.isArray(s.content) ? s.content : [JSON.stringify(s.content)],
        recommendations: topRecommendations.slice(0, 3),
      })),
      generatedAt: new Date(),
    });

    return blueprint;
  }

  /**
   * Generates a clean, print-optimized HTML report ready for browser print-to-PDF.
   */
  public async generateHtmlReport(projectId: string, userId: string): Promise<string> {
    const blueprint = await this.generateBlueprint(projectId, userId);

    const rowsHtml = blueprint.sections
      .map(
        (s) => `
        <div style="margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
          <div style="font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 700; letter-spacing: 0.05em;">Section ${s.number}</div>
          <h2 style="margin: 4px 0 8px 0; font-size: 18px; color: #0f172a;">${s.title}</h2>
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #475569; font-style: italic;">${s.summary}</p>
          <div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; font-size: 13px; line-height: 1.6; color: #1e293b;">
            ${typeof s.content === 'string' ? s.content : `<pre style="margin:0; font-family:inherit; white-space:pre-wrap;">${JSON.stringify(s.content, null, 2)}</pre>`}
          </div>
        </div>
      `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${blueprint.startupName} — Autonomous Startup Blueprint</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      .no-print { display: none; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 32px; max-width: 850px; margin: auto; }
    .header { border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .score-badge { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 20px; border-radius: 8px; text-align: center; }
    .score-num { font-size: 32px; font-weight: 800; color: #059669; line-height: 1; }
    .score-label { font-size: 11px; text-transform: uppercase; color: #065f46; font-weight: 600; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer;">
      🖨️ Print or Save as PDF
    </button>
  </div>
  <div class="header">
    <div>
      <div style="font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 700;">Autonomous Startup Builder · Final Major Project</div>
      <h1 style="margin: 4px 0 0 0; font-size: 26px;">${blueprint.startupName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Comprehensive 26-Section Venture Analysis & Blueprint · Generated ${new Date(blueprint.generatedAt).toLocaleDateString()}</p>
    </div>
    <div class="score-badge">
      <div class="score-num">${blueprint.overallScore}</div>
      <div class="score-label">${blueprint.scoreBand}</div>
      <div style="font-size: 10px; color: #047857; font-weight: 700; margin-top: 2px;">${blueprint.decisionVerdict}</div>
    </div>
  </div>

  ${rowsHtml}

  <div style="margin-top: 40px; padding: 16px; border-top: 2px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
    <strong>Disclaimer:</strong> ${blueprint.disclaimer}
  </div>
</body>
</html>`;
  }
}

export const reportService = new ReportService();
