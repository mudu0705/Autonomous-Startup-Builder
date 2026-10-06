import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  FileText,
  DollarSign,
  Layers,
  Sliders,
  ExternalLink,
  Printer,
  ChevronRight,
  Info,
  Target,
  Lightbulb,
  Briefcase,
  Activity,
  Check,
  Loader2,
} from 'lucide-react';
import { analysisApi } from '../services/analysisApi.ts';
import type { AnalysisResults, AgentId } from '../../shared/types/agent.ts';
import type { ScenarioComparison } from '../../shared/types/scenario.ts';
import type { StartupBlueprint } from '../../shared/types/report.ts';

interface AnalysisDashboardPageProps {
  projectId: string;
  navigate: (path: string) => void;
}

type TabType = 'overview' | 'agents' | 'evidence' | 'finance' | 'scenarios' | 'mvp' | 'blueprint';

export const AnalysisDashboardPage: React.FC<AnalysisDashboardPageProps> = ({ projectId, navigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('idea_problem');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [blueprint, setBlueprint] = useState<StartupBlueprint | null>(null);

  // Scenario Simulator State
  const [simBudget, setSimBudget] = useState<number>(500000);
  const [simOpEx, setSimOpEx] = useState<number>(50000);
  const [simPrice, setSimPrice] = useState<number>(750);
  const [simUsers, setSimUsers] = useState<number>(150);
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenarioComparison, setScenarioComparison] = useState<ScenarioComparison | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [resData, bpData] = await Promise.all([
          analysisApi.getResults(projectId),
          analysisApi.getBlueprint(projectId),
        ]);
        setResults(resData);
        setBlueprint(bpData);

        // Pre-populate simulator defaults from real results
        if (resData.agents.finance_budget) {
          setSimBudget(resData.agents.finance_budget.startingBudgetINR);
          const opex = resData.agents.finance_budget.monthlyOperatingCosts.reduce((a, b) => a + b.amountINR, 0);
          if (opex > 0) setSimOpEx(opex);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load analysis results.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [projectId]);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const comp = await analysisApi.createScenario(projectId, {
        title: `What-If Simulation (₹${(simBudget / 100000).toFixed(1)}L Budget, ₹${simOpEx.toLocaleString()} OpEx)`,
        changes: {
          budgetINR: simBudget,
          monthlyOpExINR: simOpEx,
          pricingINR: simPrice,
          expectedUsersMonth12: simUsers,
        },
      });
      setScenarioComparison(comp);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3 max-w-md mx-auto">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
        <h2 className="text-base font-semibold text-slate-200">Loading Venture Intelligence...</h2>
        <p className="text-xs text-slate-400">Assembling 9 agent assessments, score models, and blueprint</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="max-w-md mx-auto py-16 space-y-4 text-center">
        <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Analysis Data Unavailable</h2>
        <p className="text-xs text-slate-400">{error || 'Could not find completed analysis.'}</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/projects/${projectId}/progress`)}>
            Run Analysis
          </Button>
        </div>
      </div>
    );
  }

  const { overallScore, scoreBand, decisionVerdict, agents, topRecommendations, strengths, weaknesses, allSources } = results;

  const agentKeys: AgentId[] = [
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

  const currentAgentData = agents[selectedAgent];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Venture Intelligence Report
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400">9-Agent Autonomous Analysis</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            {blueprint?.startupName || 'Startup Analysis'}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Projects
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(analysisApi.getPdfUrl(projectId), '_blank')}
          >
            <Printer className="h-4 w-4 mr-1.5 text-emerald-400" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Hero Score & Decision Banner */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800 shadow-xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
            {/* Score circle */}
            <div className="flex items-center gap-5 lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-800 pb-4 lg:pb-0 lg:pr-6">
              <div className="relative flex items-center justify-center h-20 w-20 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10 shrink-0">
                <span className="text-3xl font-black font-mono tracking-tight">{overallScore}</span>
                <span className="absolute -bottom-2 text-[9px] uppercase tracking-wider font-bold bg-slate-950 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400">
                  / 100
                </span>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Startup Potential Score
                </div>
                <div className="text-base font-bold text-white mt-0.5">{scoreBand}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Equal 1/9th weights across all 9 agents
                </div>
              </div>
            </div>

            {/* AI Decision Verdict */}
            <div className="lg:col-span-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Synthesis Decision:
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  decisionVerdict === 'Proceed'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : decisionVerdict === 'Proceed with changes'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : decisionVerdict === 'Validate first'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {decisionVerdict}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {agents.strategy?.decisionRationale || 'Strategic assessment synthesizes all 8 previous venture dimensions.'}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="lg:col-span-1 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Runway</div>
                <div className="text-white font-mono font-bold text-sm mt-0.5">
                  {agents.finance_budget?.cashRunwayMonths || 6} mo
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-semibold">Break-Even</div>
                <div className="text-emerald-400 font-mono font-bold text-sm mt-0.5">
                  M{agents.finance_budget?.breakEvenMonth || '10+'}
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              Disclaimer: This score is a structured assessment based on the system&apos;s analysis, assumptions, and available evidence. It is not a prediction or guarantee of actual startup success.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto pb-px">
        {[
          { key: 'overview', label: 'Overview & Decision', icon: <TrendingUp className="h-4 w-4" /> },
          { key: 'agents', label: '9 Agent Reports', icon: <Activity className="h-4 w-4" /> },
          { key: 'evidence', label: `Evidence (${allSources.length})`, icon: <ExternalLink className="h-4 w-4" /> },
          { key: 'finance', label: 'Financial Projections', icon: <DollarSign className="h-4 w-4" /> },
          { key: 'scenarios', label: 'What-If Simulator', icon: <Sliders className="h-4 w-4" /> },
          { key: 'mvp', label: 'MVP Architecture', icon: <Layers className="h-4 w-4" /> },
          { key: 'blueprint', label: '26-Section Blueprint', icon: <FileText className="h-4 w-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW & DECISION SUMMARY */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 9 Score Cards Bar Visualization */}
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800/80">
              <CardTitle className="text-base text-white flex items-center justify-between">
                <span>Nine Dimension Venture Ratings</span>
                <span className="text-xs font-mono font-normal text-slate-400">Equal 1/9th Weighting</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-9 gap-2">
                {agentKeys.map((key) => {
                  const agentData = agents[key];
                  const score = agentData?.score || 70;
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        setSelectedAgent(key);
                        setActiveTab('agents');
                      }}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all text-center group"
                    >
                      <div className="text-[10px] uppercase font-semibold text-slate-400 group-hover:text-emerald-400 truncate">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xl font-bold font-mono text-white mt-1 group-hover:text-emerald-300">
                        {score}
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Decision Summary (7 Questions) */}
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                AI Decision Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-300">1. Should you pursue this startup?</div>
                  <p className="text-emerald-400 font-bold">{decisionVerdict}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-300">2. Why?</div>
                  <p className="text-slate-300 leading-relaxed">
                    Overall score of {overallScore}/100 shows solid addressable market demand and defensible unit economics.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-300">3. Top Supporting Factors:</div>
                <ul className="space-y-1 text-slate-300 list-disc list-inside">
                  {strengths.slice(0, 4).map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-300">4. Biggest Concerns:</div>
                <ul className="space-y-1 text-rose-300 list-disc list-inside">
                  {weaknesses.slice(0, 3).map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-300">5. What should be validated before building?</div>
                  <p className="text-slate-300">
                    Conduct 15 customer discovery interviews with {agents.customer_validation?.primaryTargetCustomers || 'target users'} to verify willingness-to-pay.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-300">6. What should be changed or adjusted?</div>
                  <p className="text-slate-300">
                    Restrict MVP v1 strictly to P0 core loops; avoid secondary mobile apps until web retention is proven.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Recommendations */}
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-emerald-400" />
                Actionable Venture Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                    <span className="font-mono font-bold text-emerald-400 mt-0.5">#{idx + 1}</span>
                    <p className="leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: 9 SPECIALIZED AGENT REPORTS */}
      {/* ============================================================== */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agent Selector Sidebar */}
          <div className="lg:col-span-1 space-y-1.5">
            {agentKeys.map((key) => {
              const aData = agents[key];
              const isSel = selectedAgent === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedAgent(key)}
                  className={`w-full p-3 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between border ${
                    isSel
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400">
                    {aData?.score || 70}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Agent Detailed Report Card */}
          <div className="lg:col-span-3">
            {currentAgentData ? (
              <Card className="bg-slate-900/90 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-emerald-400">
                        Autonomous Specialized Agent
                      </div>
                      <CardTitle className="text-xl font-bold text-white mt-1">
                        {currentAgentData.name}
                      </CardTitle>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-emerald-400">
                        {currentAgentData.score}/100
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Confidence: {Math.round(currentAgentData.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-5 text-xs">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Executive Finding
                    </span>
                    <p className="text-slate-200 text-sm leading-relaxed">
                      {currentAgentData.executiveSummary}
                    </p>
                  </div>

                  {/* Key Findings */}
                  {currentAgentData.keyFindings && currentAgentData.keyFindings.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold text-slate-300">Key Analytical Findings:</span>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                        {currentAgentData.keyFindings.map((f, idx) => (
                          <li key={idx}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strengths & Weaknesses Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                      <span className="font-semibold text-emerald-400">Key Strengths</span>
                      <ul className="space-y-1 text-slate-300 list-disc list-inside">
                        {currentAgentData.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                      <span className="font-semibold text-rose-400">Vulnerabilities / Risks</span>
                      <ul className="space-y-1 text-slate-300 list-disc list-inside">
                        {currentAgentData.weaknesses.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-300">Agent Recommendations:</span>
                    <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                      {currentAgentData.recommendations.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Limitations */}
                  {currentAgentData.limitations && currentAgentData.limitations.length > 0 && (
                    <div className="text-[11px] text-slate-400 italic">
                      Note: {currentAgentData.limitations.join(' ')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="p-12 text-center text-slate-400">Select an agent to view its assessment.</div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: EVIDENCE & SOURCES */}
      {/* ============================================================== */}
      {activeTab === 'evidence' && (
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-base text-white flex items-center justify-between">
              <span>Research Citations &amp; Evidence Library</span>
              <span className="text-xs font-mono text-slate-400">{allSources.length} sources verified</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Traceable provenance records collected during Market Research and Competitor Analysis phases.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {allSources.length > 0 ? (
              <div className="space-y-3">
                {allSources.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition-colors flex items-start justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-200">{s.title}</div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-2">
                        <span className="text-emerald-400 font-medium">{s.publisher || 'Web'}</span>
                        <span>·</span>
                        <span>Agent: {s.agentId}</span>
                        {s.claimSupported && (
                          <>
                            <span>·</span>
                            <span className="italic">&quot;{s.claimSupported}&quot;</span>
                          </>
                        )}
                      </div>
                    </div>

                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-emerald-300 hover:border-emerald-500 text-[11px] shrink-0 flex items-center gap-1"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Info className="h-8 w-8 text-slate-600 mx-auto" />
                <div className="font-semibold text-slate-300">Live Web Search Provider Offline</div>
                <p className="text-xs max-w-md mx-auto">
                  External search API credentials were not configured during this analysis run. Analytical market models were derived from macroeconomic baselines without fabricating synthetic URLs.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================== */}
      {/* TAB 4: FINANCIAL PROJECTIONS */}
      {/* ============================================================== */}
      {activeTab === 'finance' && agents.finance_budget && (
        <div className="space-y-6">
          {/* Runway Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['conservative', 'expected', 'optimistic'].map((scKey) => {
              const sc = (agents.finance_budget?.scenarios as any)[scKey];
              const isExp = scKey === 'expected';
              return (
                <div
                  key={scKey}
                  className={`p-4 rounded-xl border ${
                    isExp
                      ? 'bg-slate-900 border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="capitalize font-bold text-slate-300">{scKey} Scenario</span>
                    {isExp && <span className="text-[10px] text-emerald-400 font-mono">Baseline</span>}
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Cash Runway:</span>
                      <strong className="text-white font-mono">{sc?.runwayMonths} Months</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly OpEx:</span>
                      <span className="text-slate-300 font-mono">₹{sc?.monthlyOperatingCostINR?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Break-Even:</span>
                      <strong className="text-emerald-400 font-mono">
                        {sc?.breakEvenMonth ? `Month ${sc.breakEvenMonth}` : '12+ Months'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-1.5 mt-1.5">
                      <span>12-Mo Net:</span>
                      <span className={`font-mono font-bold ${sc?.twelveMonthProfitINR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{sc?.twelveMonthProfitINR?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Budget Allocation Breakdown */}
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800/80">
              <CardTitle className="text-sm font-semibold text-white">Recommended Capital Allocation</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {agents.finance_budget.budgetAllocationBreakdown.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[11px] truncate">{item.category}</div>
                    <div className="text-base font-bold font-mono text-emerald-400">{item.percentage}%</div>
                    <div className="text-[11px] text-slate-500 font-mono">₹{item.amountINR.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: WHAT-IF SCENARIO SIMULATOR */}
      {/* ============================================================== */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-emerald-400" />
                What-If Assumption Simulator
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Modify capital, pricing, and operating assumptions to observe real-time dependency-aware score and runway changes without destroying baseline analysis.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              <form onSubmit={handleRunSimulation} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Starting Budget (INR):</label>
                  <input
                    type="number"
                    step="50000"
                    value={simBudget}
                    onChange={(e) => setSimBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monthly OpEx (INR):</label>
                  <input
                    type="number"
                    step="5000"
                    value={simOpEx}
                    onChange={(e) => setSimOpEx(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Pricing / ARPU (INR):</label>
                  <input
                    type="number"
                    step="100"
                    value={simPrice}
                    onChange={(e) => setSimPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <Button type="submit" variant="primary" size="md" className="w-full" isLoading={isSimulating}>
                    Run Simulation
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Comparison Output */}
          {scenarioComparison && (
            <Card className="bg-slate-900 border-emerald-500/40 shadow-xl">
              <CardHeader className="border-b border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Simulation Comparison: Original vs. Scenario</span>
                  <span className="text-xs font-mono text-emerald-400">Delta Recalculated</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                {/* Score Comparison row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400">Original Score</span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {scenarioComparison.originalFinalScore}/100
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400">Simulated Score</span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {scenarioComparison.scenarioFinalScore}/100
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400">Runway Shift</span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {scenarioComparison.financialImpact.scenarioRunwayMonths.toFixed(1)} mo
                    </div>
                  </div>
                </div>

                {/* Dimension changes */}
                <div className="space-y-2">
                  <span className="font-semibold text-slate-300">Affected Dimension Impacts:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {scenarioComparison.dimensionChanges.map((dc) => (
                      <div key={dc.dimension} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-white">{dc.dimension}</span>
                          <span className={`font-mono ${dc.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {dc.delta >= 0 ? `+${dc.delta}` : dc.delta} pts
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{dc.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: MVP ARCHITECTURE */}
      {/* ============================================================== */}
      {activeTab === 'mvp' && agents.mvp_product && (
        <div className="space-y-6">
          <Card className="bg-slate-900/90 border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base text-white">MVP Objective &amp; Prioritization</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {agents.mvp_product.mvpObjective}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="space-y-2">
                <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider">
                  Must-Have Features (P0 Launch Scope):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agents.mvp_product.mustHaveFeatures.map((f, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="font-bold text-white">{f.name}</div>
                      <p className="text-slate-400 text-[11px]">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="font-bold text-rose-400 uppercase text-[10px] tracking-wider">
                  Features to Avoid Initially (Scope Creep Guard):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agents.mvp_product.featuresToAvoidInitially.map((f, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <div className="font-semibold text-rose-300">{f.name}</div>
                      <p className="text-slate-500 text-[11px]">{f.reasonToAvoid}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: 26-SECTION BLUEPRINT & PDF EXPORT */}
      {/* ============================================================== */}
      {activeTab === 'blueprint' && blueprint && (
        <Card className="bg-slate-900/90 border-slate-800">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-white">
                  Consolidated Startup Blueprint (26 Sections)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  Complete venture synthesis prepared for stakeholders and examiners.
                </CardDescription>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(analysisApi.getPdfUrl(projectId), '_blank')}
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Print / Save PDF
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-4 divide-y divide-slate-800 text-xs">
            {blueprint.sections.map((section) => (
              <div key={section.number} className="py-4 space-y-1.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">
                    Section {section.number}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {section.agentId ? `Agent: ${section.agentId}` : 'Synthesis'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{section.title}</h3>
                <p className="text-slate-400 italic">{section.summary}</p>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-300 text-xs mt-1.5 whitespace-pre-wrap leading-relaxed">
                  {typeof section.content === 'string'
                    ? section.content
                    : JSON.stringify(section.content, null, 2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
