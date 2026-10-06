import React from 'react';
import { Card, CardContent } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Target,
  Layers,
  IndianRupee,
  Activity,
  FileText,
  Compass,
  CheckCircle2,
} from 'lucide-react';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const agents = [
    { number: '01', name: 'Idea & Problem', desc: 'Problem-solution fit, pain points, alternatives', icon: <Target className="h-4 w-4 text-emerald-400" /> },
    { number: '02', name: 'Market Research', desc: 'TAM/SAM/SOM sizing, Indian demographic trends', icon: <TrendingUp className="h-4 w-4 text-sky-400" /> },
    { number: '03', name: 'Competitor Analysis', desc: 'Feature matrix, status-quo gap analysis', icon: <Compass className="h-4 w-4 text-amber-400" /> },
    { number: '04', name: 'Customer & Validation', desc: 'User personas, falsifiable hypotheses', icon: <ShieldCheck className="h-4 w-4 text-teal-400" /> },
    { number: '05', name: 'Business Model', desc: 'BMC synthesis, revenue streams, unit economics', icon: <Layers className="h-4 w-4 text-indigo-400" /> },
    { number: '06', name: 'Finance & Budget', desc: 'Deterministic arithmetic runway, P&L, scenarios', icon: <IndianRupee className="h-4 w-4 text-emerald-400" /> },
    { number: '07', name: 'MVP / Product', desc: 'P0 lean scope, technical architecture, roadmap', icon: <Activity className="h-4 w-4 text-purple-400" /> },
    { number: '08', name: 'Risk & Feasibility', desc: 'Multi-vector risk matrix and feasibility scores', icon: <ShieldCheck className="h-4 w-4 text-rose-400" /> },
    { number: '09', name: 'Strategy & Synthesis', desc: 'Positioning, GTM channels, 30/60/90 day plan', icon: <Sparkles className="h-4 w-4 text-amber-400" /> },
  ];

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>CSE Major Project · Autonomous Startup Decision Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Transform Startup Ideas into Validated Blueprints
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
          An autonomous multi-agent venture analysis platform that converts founder concepts into structured 9-dimensional evaluations, deterministic financial runways, and a complete 26-section Startup Blueprint.
        </p>

        {/* Core Value Pipeline Message */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-slate-300 pt-2 flex-wrap">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white">Idea</span>
          <span className="text-emerald-400 font-bold">→</span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white">Research</span>
          <span className="text-emerald-400 font-bold">→</span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white">Analysis</span>
          <span className="text-emerald-400 font-bold">→</span>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">Startup Blueprint</span>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4">
          <Button variant="primary" size="md" onClick={() => navigate('/dashboard')} className="gap-2 text-sm px-6">
            <span>Analyze Your Startup</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="md" onClick={() => navigate('/register')} className="text-sm">
            Create Account
          </Button>
        </div>
      </section>

      {/* 9-Agent Pipeline Visual Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Nine Coordinated Autonomous Agents
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Each agent operates as an analytical component within an integrated venture evaluation pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {agents.map((agent) => (
            <div
              key={agent.number}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-400 text-xs font-bold">{agent.number}</span>
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 group-hover:border-emerald-500/30">
                  {agent.icon}
                </div>
              </div>

              <div className="font-semibold text-sm text-white group-hover:text-emerald-300 transition-colors">
                {agent.name}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {agent.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-5 space-y-2 text-xs">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Deterministic Scoring</h3>
            <p className="text-slate-400 leading-relaxed">
              Zero hallucinated scores. All 9 dimensions are weighted equally (1/9th) and aggregated strictly through server-side deterministic formulas.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-5 space-y-2 text-xs">
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
              <IndianRupee className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Mathematical Pro-Forma Runway</h3>
            <p className="text-slate-400 leading-relaxed">
              Financial arithmetic is computed via a dedicated server engine for cash burn, 12-month P&amp;L, and break-even milestones across 3 scenarios.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-5 space-y-2 text-xs">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">26-Section Blueprint &amp; PDF</h3>
            <p className="text-slate-400 leading-relaxed">
              Consolidates problem statements, competitive matrices, GTM strategy, and clickable research citations into a printable investor-grade report.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Academic Prototype Callout */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">CSE Major Project Academic Demonstration</h3>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Built as a comprehensive paired system: React/Vite/Tailwind frontend, Fastify/Node backend, MongoDB persistence, Argon2/JWT authentication, and Gemini 3.8 Flash orchestration.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')} className="shrink-0 gap-1.5">
          <span>Get Started</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </section>
    </div>
  );
};
