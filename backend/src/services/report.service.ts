import mongoose from 'mongoose';
import { ProjectModel } from '../models/Project.ts';
import { AnalysisModel } from '../models/Analysis.ts';
import { ReportModel, IReportDocument } from '../models/Report.ts';
import { orchestrator } from './orchestrator.service.ts';
import { projectService } from './project.service.ts';
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
    const project = await projectService.getUserProjectById(userId, projectId);

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

    // Upsert to ReportModel (safeguarded for serverless / zero-database mode)
    try {
      if (mongoose.connection.readyState === 1) {
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
      }
    } catch (dbErr) {
      logger.warn({ err: dbErr }, 'ReportModel MongoDB upsert skipped');
    }

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
        <div style="margin-bottom: 28px; padding-bottom: 22px; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
          <div style="font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 700; letter-spacing: 0.05em;">Section ${s.number}</div>
          <h2 style="margin: 4px 0 6px 0; font-size: 18px; color: #0f172a; font-weight: 700;">${escapeHtml(s.title)}</h2>
          <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569; font-style: italic;">${escapeHtml(s.summary)}</p>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 18px 20px; border-radius: 8px; font-size: 13px; line-height: 1.6; color: #1e293b;">
            ${formatSectionContent(s.content)}
          </div>
        </div>
      `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(blueprint.startupName)} — Autonomous Startup Blueprint (PDF)</title>
  <style>
    @media print {
      body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #fff; }
      .no-print { display: none !important; }
      @page { margin: 1.2cm; }
      .section-card { page-break-inside: avoid; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 36px; max-width: 880px; margin: auto; background: #f8fafc; }
    .header { border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
    .score-badge { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 20px; border-radius: 8px; text-align: center; }
    .score-num { font-size: 34px; font-weight: 800; color: #059669; line-height: 1; }
    .score-label { font-size: 11px; text-transform: uppercase; color: #065f46; font-weight: 600; margin-top: 4px; }
  </style>
  <script>
    window.addEventListener('load', function() {
      // Prompt native browser print/save-as-PDF dialog automatically
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.error(e);
        }
      }, 400);
    });
  </script>
</head>
<body>
  <div class="no-print" style="margin-bottom: 24px; padding: 14px 18px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <span style="font-size: 13px; font-weight: 600; color: #1e293b;">📄 Printable Startup Blueprint</span>
      <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">In your browser's Print window, select <strong>"Save as PDF"</strong> as Destination to download.</p>
    </div>
    <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      🖨️ Download / Save as PDF
    </button>
  </div>
  <div class="header">
    <div>
      <div style="font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 700; letter-spacing: 0.05em;">Autonomous Startup Builder · Final Major Project</div>
      <h1 style="margin: 4px 0 0 0; font-size: 26px; color: #0f172a; font-weight: 800;">${escapeHtml(blueprint.startupName)}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Comprehensive 26-Section Venture Analysis & Blueprint · Generated ${new Date(blueprint.generatedAt).toLocaleDateString()}</p>
    </div>
    <div class="score-badge">
      <div class="score-num">${blueprint.overallScore}</div>
      <div class="score-label">${escapeHtml(blueprint.scoreBand)}</div>
      <div style="font-size: 10px; color: #047857; font-weight: 700; margin-top: 2px;">${escapeHtml(blueprint.decisionVerdict)}</div>
    </div>
  </div>

  ${rowsHtml}

  <div style="margin-top: 40px; padding: 16px; border-top: 2px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
    <strong>Disclaimer:</strong> ${escapeHtml(blueprint.disclaimer)}
  </div>
</body>
</html>`;
  }
}

/**
 * Escapes HTML characters to prevent XSS or layout breakage.
 */
function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts camelCase or snake_case key strings into human-readable English titles.
 */
function formatKeyTitle(key: string): string {
  const dictionary: Record<string, string> = {
    problemStatement: 'Problem Statement',
    rootCauses: 'Root Causes',
    painPoints: 'Key Pain Points',
    currentAlternatives: 'Current Alternatives & Workarounds',
    proposedSolution: 'Proposed Solution',
    valueProposition: 'Value Proposition',
    fitAssessment: 'Problem-Solution Fit Assessment',
    primaryAudience: 'Primary Target Audience',
    secondaryAudience: 'Secondary Target Audience',
    geographicRelevance: 'Geographic Market Relevance',
    tam: 'Total Addressable Market (TAM)',
    sam: 'Serviceable Addressable Market (SAM)',
    som: 'Serviceable Obtainable Market (SOM)',
    overview: 'Market Overview',
    methodology: 'Market Sizing Methodology',
    trends: 'Major Market Trends',
    opportunities: 'Market Opportunities',
    barriers: 'Market Barriers',
    directCompetitors: 'Direct Competitors',
    indirectCompetitors: 'Indirect Competitors',
    alternatives: 'Alternative Workarounds',
    featureMatrix: 'Feature Comparison Matrix',
    whatCompetitorsAreMissing: 'What Competitors Are Missing',
    whatCustomersAreMissing: 'What Customers Are Missing',
    underservedSegments: 'Underserved Customer Segments',
    differentiationOpportunities: 'Differentiation Opportunities',
    proposedAdvantage: 'Proposed Unfair Advantage',
    hypotheses: 'Validation Hypotheses',
    interviewStrategy: 'Customer Interview Strategy',
    surveyStrategy: 'Survey Validation Strategy',
    prototypeExperiment: 'Prototype Usability Experiment',
    landingPageExperiment: 'Landing Page Smoke-Test Experiment',
    revenueStreams: 'Revenue Streams & Pricing Architecture',
    modelComparison: 'Business Model Comparison',
    unitEconomics: 'Unit Economics Benchmarks',
    channels: 'Distribution & Acquisition Channels',
    keyPartners: 'Strategic Partners & Ecosystem Integrations',
    budget: 'Starting Budget',
    budgetSource: 'Budget Source',
    initialSetupCosts: 'Initial Setup & Capital Expenditures',
    monthlyOpEx: 'Monthly Operating Expenses (OpEx)',
    scenarios: 'Financial Growth Scenarios',
    budgetAllocation: 'Capital Allocation Breakdown',
    formulas: 'Deterministic Mathematical Models',
    mvpObjective: 'MVP Core Objective',
    mustHaveFeatures: 'Must-Have Features (P0)',
    featuresToAvoid: 'Features to Avoid Initially',
    techStack: 'Recommended Technology Architecture',
    roadmap: 'MVP Development Roadmap',
    scores: 'Feasibility Ratings',
    conclusion: 'Feasibility Assessment',
    majorConcerns: 'Major Concerns & Bottlenecks',
    positioningStatement: 'Strategic Positioning Statement',
    differentiation: 'Defensible Differentiation',
    criticalSuccessFactors: 'Critical Success Factors',
    gtmStrategy: 'Go-to-Market Strategy',
    partnerships: 'Strategic Partnerships',
    thirtyDays: 'Day 1 – 30 Execution Goals (Discovery & Wireframing)',
    sixtyDays: 'Day 31 – 60 Execution Goals (MVP Build & Beta Pilot)',
    ninetyDays: 'Day 61 – 90 Execution Goals (Public Launch & Monetization)',
    decision: 'Final Strategic Verdict',
    rationale: 'Strategic Decision Rationale',
    strengths: 'Key Venture Strengths',
    weaknesses: 'Identified Vulnerabilities & Risks',
    ideaProblemAssumptions: 'Idea & Problem Assumptions',
    marketAssumptions: 'Market & Industry Assumptions',
    businessAssumptions: 'Business Model Assumptions',
    financeAssumptions: 'Financial Planning Assumptions',
    overallScore: 'Overall Potential Score',
    scoreBand: 'Score Band',
    formula: 'Scoring Methodology',
  };

  if (dictionary[key]) return dictionary[key];

  const words = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Main recursive formatter converting arbitrary objects/arrays into clean English HTML.
 */
function formatSectionContent(content: any): string {
  if (content === null || content === undefined) {
    return '<p style="color: #64748b; font-style: italic; margin: 0;">None documented.</p>';
  }

  // 1. Strings
  if (typeof content === 'string') {
    if (!content.trim()) {
      return '<p style="color: #64748b; font-style: italic; margin: 0;">Not specified.</p>';
    }
    if (content.includes('\n')) {
      return content
        .split('\n')
        .filter((l) => l.trim() !== '')
        .map((l) => `<p style="margin: 0 0 8px 0; line-height: 1.6;">${escapeHtml(l)}</p>`)
        .join('');
    }
    return `<p style="margin: 0; line-height: 1.6;">${escapeHtml(content)}</p>`;
  }

  // 2. Numbers & Booleans
  if (typeof content === 'number' || typeof content === 'boolean') {
    return `<span style="font-weight: 600; color: #0f172a;">${escapeHtml(String(content))}</span>`;
  }

  // 3. Arrays
  if (Array.isArray(content)) {
    if (content.length === 0) {
      return '<p style="color: #64748b; font-style: italic; margin: 0;">No items recorded.</p>';
    }

    // Array of strings or numbers -> Clean bulleted list
    if (content.every((x) => typeof x === 'string' || typeof x === 'number')) {
      return `
        <ul style="margin: 4px 0 4px 0; padding-left: 20px; line-height: 1.6;">
          ${content.map((item) => `<li style="margin-bottom: 6px; color: #1e293b;">${escapeHtml(String(item))}</li>`).join('')}
        </ul>
      `;
    }

    // 9 Dimensions Score array: [{ dimension, score }]
    if (content.every((x) => x && typeof x === 'object' && 'dimension' in x && 'score' in x)) {
      return `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; margin-top: 6px;">
          ${content
            .map(
              (item: any) => `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600; font-size: 13px; color: #334155;">${escapeHtml(item.dimension)}</span>
              <span style="font-weight: 800; font-size: 13px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 12px;">${escapeHtml(item.score)}/100</span>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    // Array of Objects (Personas, Competitors, Risks, Features, etc.)
    return `
      <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 4px;">
        ${content.map((item, idx) => formatStructuredCard(item, idx + 1)).join('')}
      </div>
    `;
  }

  // 4. Objects
  if (typeof content === 'object') {
    return formatObjectKeyValues(content);
  }

  return escapeHtml(String(content));
}

/**
 * Formats a single item from an array into an executive card.
 */
function formatStructuredCard(obj: any, index: number): string {
  if (!obj || typeof obj !== 'object') {
    return `<div style="padding: 6px 0;">${escapeHtml(String(obj))}</div>`;
  }

  const title =
    obj.name ||
    obj.item ||
    obj.streamName ||
    obj.title ||
    obj.hypothesis ||
    obj.risk ||
    obj.modelName ||
    obj.feature ||
    `Item #${index}`;

  const keysToSkip = new Set(['name', 'item', 'streamName', 'title', 'hypothesis', 'risk', 'modelName', 'feature', 'id']);

  let badge = '';
  if (obj.priority) {
    badge = `<span style="background: #e0e7ff; color: #3730a3; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 4px;">${escapeHtml(obj.priority)}</span>`;
  } else if (obj.category) {
    badge = `<span style="background: #f1f5f9; color: #475569; font-weight: 600; font-size: 11px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${escapeHtml(obj.category)}</span>`;
  } else if (obj.type) {
    badge = `<span style="background: #f1f5f9; color: #475569; font-weight: 600; font-size: 11px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${escapeHtml(obj.type)}</span>`;
  } else if (obj.amountINR !== undefined) {
    badge = `<span style="background: #ecfdf5; color: #059669; font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: 4px;">₹${Number(obj.amountINR).toLocaleString()} INR</span>`;
  }

  let body = '';
  for (const [key, value] of Object.entries(obj)) {
    if (keysToSkip.has(key) || key === 'priority' || key === 'category' || key === 'type') continue;
    body += `
      <div style="margin-top: 6px; font-size: 13px;">
        <strong style="color: #475569; font-weight: 600;">${formatKeyTitle(key)}:</strong>
        <div style="margin-top: 2px; color: #1e293b;">${formatSectionContent(value)}</div>
      </div>
    `;
  }

  return `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
        <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${escapeHtml(title)}</div>
        ${badge}
      </div>
      ${body}
    </div>
  `;
}

/**
 * Formats key-value pairs of an object into clean titled blocks.
 */
function formatObjectKeyValues(obj: any): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return '<p style="color: #64748b; font-style: italic; margin: 0;">None documented.</p>';
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${entries
        .map(([key, value]) => {
          const label = formatKeyTitle(key);
          return `
          <div style="border-left: 3px solid #10b981; padding-left: 12px;">
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">${escapeHtml(label)}</div>
            <div style="color: #334155; font-size: 13px;">${formatSectionContent(value)}</div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
}

export const reportService = new ReportService();
