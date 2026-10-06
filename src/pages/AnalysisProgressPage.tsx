import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { analysisApi, AnalysisStatusResponse } from '../services/analysisApi.ts';

interface AnalysisProgressPageProps {
  projectId: string;
  navigate: (path: string) => void;
}

export const AnalysisProgressPage: React.FC<AnalysisProgressPageProps> = ({ projectId, navigate }) => {
  const [data, setData] = useState<AnalysisStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const timerRef = useRef<number | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await analysisApi.getStatus(projectId);
      setData(res);

      if (res.status === 'completed') {
        // Automatically navigate to dashboard when complete
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => {
          navigate(`/projects/${projectId}/dashboard`);
        }, 1200);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to query analysis status');
    }
  };

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await analysisApi.startAnalysis(projectId);
      await fetchStatus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Setup polling every 1500ms
    const interval = window.setInterval(() => {
      fetchStatus();
    }, 1500);
    timerRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [projectId]);

  const progressPercent = data?.progressPercent ?? 0;
  const isCompleted = data?.status === 'completed';
  const isFailed = data?.status === 'failed';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 3 &amp; 4 · Multi-Agent Orchestrator
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Building Your Startup Blueprint
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Coordinating 9 specialized AI agents to evaluate problem fit, market demand, unit economics, and execution strategy.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Projects
          </Button>

          {data?.status === 'ready_to_start' && (
            <Button variant="primary" size="sm" isLoading={isStarting} onClick={handleStart}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Start 9-Agent Analysis
            </Button>
          )}

          {isCompleted && (
            <Button variant="primary" size="sm" onClick={() => navigate(`/projects/${projectId}/dashboard`)}>
              View Analysis Dashboard
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">Execution Error</div>
            <p>{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleStart}>
            Retry
          </Button>
        </div>
      )}

      {/* Overall Progress Card */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 text-sm">Pipeline Execution Progress:</span>
              <span className="text-emerald-400 font-mono font-semibold text-sm">
                {progressPercent}%
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Current Phase:</span>
              <span className="font-mono font-bold text-slate-200 uppercase">
                {data?.currentAgent ? data.currentAgent.replace(/_/g, ' ') : data?.status || 'INITIALIZING'}
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
            <span>9 Specialized Autonomous Agents</span>
            <span>Deterministic Venture Scoring &amp; Evidence Grounding</span>
          </div>
        </CardContent>
      </Card>

      {/* 9 Agent Pipeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {(data?.agents || []).map((agent, index) => {
          const isCurrent = data?.currentAgent === agent.id;
          const isDone = agent.status === 'completed';
          const isRunning = agent.status === 'running' || isCurrent;
          const isRetrying = agent.status === 'retrying';
          const isFailedStatus = agent.status === 'failed';

          return (
            <div
              key={agent.id}
              className={`p-4 rounded-xl border transition-all ${
                isDone
                  ? 'bg-slate-900/90 border-emerald-500/30'
                  : isRunning
                  ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : isFailedStatus
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono text-[10px] text-slate-400">
                  Agent {index + 1} of 9
                </span>

                {isDone ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Complete
                  </span>
                ) : isRunning ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Running
                  </span>
                ) : isRetrying ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Retrying
                  </span>
                ) : isFailedStatus ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Failed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                  </span>
                )}
              </div>

              <div className="font-semibold text-sm text-slate-100 mb-1">
                {agent.name}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 mt-2">
                {agent.score !== undefined ? (
                  <span className="font-mono text-emerald-400 font-semibold">
                    Score: {agent.score}/100
                  </span>
                ) : (
                  <span className="text-slate-500">Unscored</span>
                )}

                {agent.durationMs ? (
                  <span className="text-slate-500">
                    {(agent.durationMs / 1000).toFixed(1)}s
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-base">Analysis Pipeline Complete</div>
              <p className="text-xs text-slate-300">
                All 9 specialized agents have finished. Venture scores and the Startup Blueprint are ready.
              </p>
            </div>
          </div>

          <Button variant="primary" size="md" onClick={() => navigate(`/projects/${projectId}/dashboard`)}>
            Open Venture Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};
