import mongoose, { Schema, Document } from 'mongoose';
import type { AgentId, AgentExecutionStatus } from '../../../shared/types/agent.ts';

export interface IAgentRunDocument extends Document {
  analysisId: mongoose.Types.ObjectId;
  agentId: AgentId;
  status: AgentExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  error?: string;
  retryCount: number;
  durationMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AgentRunSchema = new Schema<IAgentRunDocument>(
  {
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'Analysis',
      required: true,
      index: true,
    },
    agentId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    inputPayload: {
      type: Schema.Types.Mixed,
    },
    outputPayload: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export const AgentRunModel =
  mongoose.models.AgentRun || mongoose.model<IAgentRunDocument>('AgentRun', AgentRunSchema);
