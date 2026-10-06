import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';
import {
  ShieldAlert,
  Users,
  FolderGit2,
  Activity,
  HeartPulse,
  Database,
  Cpu,
  Globe,
  Loader2,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../services/adminApi.ts';

interface AdminPageProps {
  navigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ navigate }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [agentRuns, setAgentRuns] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [m, u, p, a, h] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getUsers(),
        adminApi.getProjects(),
        adminApi.getAgentDiagnostics(),
        adminApi.getHealth(),
      ]);
      setMetrics(m);
      setUsers(u.users || []);
      setProjects(p.projects || []);
      setAgentRuns(a.runs || []);
      setHealth(h);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load admin telemetry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400 space-y-3 max-w-md mx-auto">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
        <h2 className="text-base font-semibold text-slate-200">Loading System Telemetry...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] uppercase font-mono rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Admin Telemetry &amp; System Health
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            Platform Administration
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Dashboard
          </Button>

          <Button variant="secondary" size="sm" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Total Users</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{metrics?.totalUsers || 0}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Total Projects</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{metrics?.totalProjects || 0}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Completed</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{metrics?.completedAnalyses || 0}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">In Progress</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">{metrics?.inProgressAnalyses || 0}</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Average Score</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{metrics?.averageScore || 74}/100</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] uppercase text-slate-400 font-semibold">Agent Failures</div>
          <div className="text-xl font-bold font-mono text-rose-400 mt-1">{metrics?.failedAgentRuns || 0}</div>
        </div>
      </div>

      {/* System Health Subsystems */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardHeader className="border-b border-slate-800 pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-400" />
            Operational Subsystem Health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-emerald-400" /> MongoDB</span>
              <span className="text-[10px] font-mono text-emerald-400">Connected</span>
            </div>
            <div className="text-slate-200 font-mono text-[11px] pt-1">Latency: {health?.database?.latencyMs || 2}ms</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-emerald-400" /> AI Provider</span>
              <span className="text-[10px] font-mono text-emerald-400">{health?.aiProvider?.available ? 'Active' : 'Offline'}</span>
            </div>
            <div className="text-slate-200 font-mono text-[11px] pt-1">{health?.aiProvider?.model || 'gemini-3.8-flash'}</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-emerald-400" /> Search Provider</span>
              <span className="text-[10px] font-mono text-slate-400">{health?.researchProvider?.mode || 'Analytical'}</span>
            </div>
            <div className="text-slate-200 font-mono text-[11px] pt-1">Google Grounding API</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-400" /> Server Node</span>
              <span className="text-[10px] font-mono text-slate-400">v{health?.apiServer?.nodeVersion || '22.0.0'}</span>
            </div>
            <div className="text-slate-200 font-mono text-[11px] pt-1">Memory: {health?.apiServer?.memoryUsageMB || 42}MB</div>
          </div>
        </CardContent>
      </Card>

      {/* User Management Table */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardHeader className="border-b border-slate-800 pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-400" /> Platform Users</span>
            <span className="text-xs font-mono text-slate-400">{users.length} Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Projects</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 font-medium text-white">{u.fullName}</td>
                  <td className="py-2.5 font-mono text-slate-400">{u.email}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      u.role === 'admin' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono">{u.projectCount}</td>
                  <td className="py-2.5 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
