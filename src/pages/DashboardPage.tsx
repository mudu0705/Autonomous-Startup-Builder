import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';
import { EmptyState } from '../components/states/EmptyState.tsx';
import {
  LayoutDashboard,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  User as UserIcon,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { projectApi } from '../services/projectApi.ts';
import type { Project, AnalysisDepth } from '../../shared/types/project.ts';

interface DashboardPageProps {
  navigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ navigate }) => {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [startupIdea, setStartupIdea] = useState('');
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectApi.getProjects();
      setProjects(data.projects);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load projects.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || name.trim().length < 2) {
      setFormError('Project name must be at least 2 characters long.');
      return;
    }

    if (!startupIdea.trim() || startupIdea.trim().length < 10) {
      setFormError('Startup idea description must be at least 10 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newProject = await projectApi.createProject({
        name: name.trim(),
        startupIdea: startupIdea.trim(),
        analysisDepth,
      });
      setProjects((prev) => [newProject, ...prev]);
      setShowCreateModal(false);
      setName('');
      setStartupIdea('');
      setAnalysisDepth('standard');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"?`)) {
      return;
    }

    try {
      await projectApi.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete project.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-emerald-400" />
            Startup Projects Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Persisted startup ideas and project history hub
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </Button>

          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Overview
          </Button>
        </div>
      </div>

      {/* Authenticated User Session Banner */}
      {user && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>{user.fullName || user.email}</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authenticated session active · User ID: <code className="font-mono text-slate-300">{user.id}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-md border border-emerald-500/20 shrink-0">
            <ShieldCheck className="h-4 w-4" />
            <span>MongoDB Persistence Active</span>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-200">Failed to load projects</div>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-400" />
                Create New Startup Project
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Project Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. QuickPay India"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Startup Idea Summary <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={startupIdea}
                  onChange={(e) => setStartupIdea(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Describe your startup concept, target problem, or proposed solution..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Analysis Depth</label>
                <select
                  value={analysisDepth}
                  onChange={(e) => setAnalysisDepth(e.target.value as AnalysisDepth)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="quick">Quick (Rapid Evaluation)</option>
                  <option value="standard">Standard (Full 9-Agent Pipeline)</option>
                  <option value="deep">Deep (Comprehensive Pro-Forma & Legal Analysis)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Project View Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedProject.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-[10px] uppercase font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedProject.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    Depth: <strong className="text-slate-200">{selectedProject.analysisDepth}</strong>
                  </span>
                  <span className="text-xs text-slate-400">
                    Score: <strong className="text-slate-200">{selectedProject.score !== null && selectedProject.score !== undefined ? `${selectedProject.score}/100` : 'Pending (Phase 5)'}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">Startup Idea</div>
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedProject.startupIdea}</p>
              </div>

              {selectedProject.proposedSolution && (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">Proposed Solution</div>
                  <p className="text-slate-200">{selectedProject.proposedSolution}</p>
                </div>
              )}

              {selectedProject.targetCustomers && (
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">Target Customers</div>
                  <p className="text-slate-200">{selectedProject.targetCustomers}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-400" /> Location Scope
                  </div>
                  <p className="text-slate-200 capitalize">
                    {selectedProject.location.country} ({selectedProject.location.scope})
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 text-emerald-400" /> Budget
                  </div>
                  <p className="text-slate-200">
                    {selectedProject.budget.amount ? `₹${selectedProject.budget.amount.toLocaleString()}` : 'Not Specified'}
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Source: {selectedProject.budget.source || 'USER'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setSelectedProject(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects List Container */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Persisted Projects History ({projects.length})
            </span>
          </CardTitle>
          <CardDescription>
            MongoDB-backed startup projects owned by authenticated user <code className="text-slate-300 font-mono">{user?.email}</code>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mx-auto" />
              <p className="text-xs">Loading user projects from database...</p>
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              title="No Startup Projects Found"
              description="You have not created any startup projects yet. Click 'New Project' above to persist your first idea."
              actionLabel="Create First Project"
              onAction={() => setShowCreateModal(true)}
            />
          ) : (
            <div className="space-y-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-semibold text-slate-100 text-sm">{proj.name}</h3>
                      <span className="px-2 py-0.5 text-[10px] uppercase font-mono rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {proj.status}
                      </span>
                      <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Depth: {proj.analysisDepth}
                      </span>
                      <span className="text-[11px] font-medium bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                        Score: {proj.score !== null && proj.score !== undefined ? `${proj.score}/100` : 'Pending'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {proj.startupIdea}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(proj.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span>·</span>
                      <span className="capitalize">
                        Location: {proj.location.country} ({proj.location.scope})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                    {proj.status === 'ANALYSIS_COMPLETED' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/projects/${proj.id}/dashboard`)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        View Blueprint
                      </Button>
                    ) : proj.status === 'READY_FOR_ANALYSIS' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/projects/${proj.id}/progress`)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1 text-emerald-300" />
                        Run Analysis
                      </Button>
                    ) : proj.status === 'ANALYSIS_RUNNING' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/projects/${proj.id}/progress`)}
                      >
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Analysis Live
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/projects/${proj.id}/intake`)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Guided Intake
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedProject(proj)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      View
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                      onClick={() => handleDeleteProject(proj.id, proj.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
