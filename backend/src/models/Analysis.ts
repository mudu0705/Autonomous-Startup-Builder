import mongoose, { Schema, Document } from 'mongoose';
import type { AnalysisStatus } from '../../../shared/types/analysis.ts';
import type { AgentId } from '../../../shared/types/agent.ts';

export interface IAnalysisDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  version: number;
  status: AnalysisStatus;
  currentAgent?: AgentId;
  progressPercent: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<IAnalysisDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'failed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    currentAgent: {
      type: String,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const AnalysisModel =
  mongoose.models.Analysis || mongoose.model<IAnalysisDocument>('Analysis', AnalysisSchema);
