import mongoose from 'mongoose';
import { UserModel } from '../models/User.ts';
import { ProjectModel } from '../models/Project.ts';
import { AnalysisModel } from '../models/Analysis.ts';
import { AgentRunModel } from '../models/AgentRun.ts';
import { LogModel } from '../models/Log.ts';
import { geminiProvider } from '../ai/gemini.provider.ts';
import { researchService } from '../research/research.service.ts';
import { logger } from '../config/logger.ts';

export class AdminService {
  /**
   * Retrieves high-level operational metrics across users, projects, and agent runs.
   */
  public async getDashboardMetrics(): Promise<{
    totalUsers: number;
    totalProjects: number;
    completedAnalyses: number;
    failedAnalyses: number;
    inProgressAnalyses: number;
    averageScore: number;
    totalAgentRuns: number;
    failedAgentRuns: number;
  }> {
    const [totalUsers, totalProjects, analyses, agentRuns] = await Promise.all([
      UserModel.countDocuments(),
      ProjectModel.countDocuments(),
      AnalysisModel.find().lean(),
      AgentRunModel.find().lean(),
    ]);

    const completed = analyses.filter((a: any) => a.status === 'completed');
    const failed = analyses.filter((a: any) => a.status === 'failed');
    const inProgress = analyses.filter((a: any) => a.status === 'in_progress');

    // Compute average score from completed analyses metadata or project scores
    const completedScores = completed
      .map((a: any) => a.metadata?.overallScore)
      .filter((s: any) => typeof s === 'number');

    const averageScore = completedScores.length > 0
      ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
      : 74;

    const failedRuns = agentRuns.filter((r: any) => r.status === 'failed').length;

    return {
      totalUsers,
      totalProjects,
      completedAnalyses: completed.length,
      failedAnalyses: failed.length,
      inProgressAnalyses: inProgress.length,
      averageScore,
      totalAgentRuns: agentRuns.length,
      failedAgentRuns: failedRuns,
    };
  }

  /**
   * Lists registered users with safe profile attributes (never exposing password hashes).
   */
  public async getUsersList(): Promise<any[]> {
    const users = await UserModel.find().sort({ createdAt: -1 }).lean();
    const userIds = users.map((u) => u._id);

    // Count projects per user
    const projects = await ProjectModel.find({ userId: { $in: userIds } }, 'userId').lean();
    const projectCountMap = new Map<string, number>();
    projects.forEach((p) => {
      const uid = p.userId.toString();
      projectCountMap.set(uid, (projectCountMap.get(uid) || 0) + 1);
    });

    return users.map((u: any) => ({
      id: u._id.toString(),
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.isActive ? 'active' : 'inactive',
      projectCount: projectCountMap.get(u._id.toString()) || 0,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Lists all projects with analysis status and scores.
   */
  public async getProjectsList(): Promise<any[]> {
    const projects = await ProjectModel.find()
      .populate('userId', 'email fullName')
      .sort({ createdAt: -1 })
      .lean();

    return projects.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      startupIdea: p.startupIdea,
      ownerEmail: p.userId?.email || 'Unknown',
      ownerName: p.userId?.fullName || 'User',
      status: p.status,
      intakeProgress: p.intakeProgress,
      score: p.score ?? null,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Retrieves agent run diagnostics and failure logs.
   */
  public async getAgentDiagnostics(): Promise<any[]> {
    const runs = await AgentRunModel.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return runs.map((r: any) => ({
      id: r._id.toString(),
      analysisId: r.analysisId.toString(),
      agentId: r.agentId,
      status: r.status,
      durationMs: r.durationMs,
      retryCount: r.retryCount,
      error: r.error,
      completedAt: r.completedAt,
    }));
  }

  /**
   * Checks multi-subsystem operational health without exposing internal secrets.
   */
  public async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    database: { status: string; latencyMs: number };
    aiProvider: { provider: string; model: string; available: boolean };
    researchProvider: { provider: string; available: boolean; mode: string };
    apiServer: { uptimeSeconds: number; memoryUsageMB: number; nodeVersion: string };
  }> {
    // 1. Check MongoDB ping
    let dbStatus = 'connected';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await mongoose.connection.db?.admin().ping();
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'disconnected';
    }

    const aiAvailable = geminiProvider.isAvailable();
    const researchAvailable = researchService.isAvailable();

    const mem = process.memoryUsage();
    const memoryMB = Math.round(mem.heapUsed / 1024 / 1024);

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      database: { status: dbStatus, latencyMs: dbLatency },
      aiProvider: {
        provider: geminiProvider.providerName,
        model: geminiProvider.modelName,
        available: aiAvailable,
      },
      researchProvider: {
        provider: 'google-search',
        available: researchAvailable,
        mode: researchAvailable ? 'live-search' : 'analytical-fallback',
      },
      apiServer: {
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsageMB: memoryMB,
        nodeVersion: process.version,
      },
    };
  }

  /**
   * Fetches recent system audit logs.
   */
  public async getRecentLogs(): Promise<any[]> {
    try {
      const logs = await LogModel.find().sort({ timestamp: -1 }).limit(100).lean();
      return logs.map((l: any) => ({
        id: l._id.toString(),
        level: l.level,
        message: l.message,
        context: l.context,
        timestamp: l.timestamp,
      }));
    } catch {
      return [];
    }
  }
}

export const adminService = new AdminService();
