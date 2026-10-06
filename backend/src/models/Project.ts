import mongoose, { Schema, Document } from 'mongoose';
import type {
  ProjectStatus,
  AnalysisDepth,
  ProjectLocation,
  ProjectBudget,
} from '../../../shared/types/project.ts';

export interface IProjectDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  startupIdea: string;
  proposedSolution?: string;
  targetCustomers?: string;
  location: ProjectLocation;
  budget: ProjectBudget;
  revenueModel?: string;
  additionalInformation?: string;
  analysisDepth: AnalysisDepth;
  status: ProjectStatus;
  intakeProgress: number;
  score?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ProjectLocation>(
  {
    country: { type: String, default: 'India', enum: ['India'] },
    scope: { type: String, enum: ['national', 'state', 'city', 'region'], default: 'national' },
    locations: { type: [String], default: [] },
  },
  { _id: false }
);

const BudgetSchema = new Schema<ProjectBudget>(
  {
    amount: { type: Number, default: null },
    currency: { type: String, default: 'INR', enum: ['INR'] },
    source: { type: String, enum: ['USER', 'AI_ESTIMATED'], default: 'USER', required: false },
    isCertain: { type: Boolean, default: true },
  },
  { _id: false }
);

const ProjectSchema = new Schema<IProjectDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startupIdea: {
      type: String,
      required: true,
      trim: true,
    },
    proposedSolution: {
      type: String,
      trim: true,
    },
    targetCustomers: {
      type: String,
      trim: true,
    },
    location: {
      type: LocationSchema,
      default: () => ({ country: 'India', scope: 'national', locations: [] }),
    },
    budget: {
      type: BudgetSchema,
      default: () => ({ amount: null, currency: 'INR', source: 'USER', isCertain: true }),
    },
    revenueModel: {
      type: String,
      trim: true,
    },
    additionalInformation: {
      type: String,
      trim: true,
    },
    analysisDepth: {
      type: String,
      enum: ['quick', 'standard', 'deep'],
      default: 'standard',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'INTAKE_IN_PROGRESS', 'READY_FOR_ANALYSIS', 'ANALYSIS_RUNNING', 'ANALYSIS_COMPLETED', 'FAILED'],
      default: 'DRAFT',
      index: true,
    },
    intakeProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

export const ProjectModel = mongoose.models.Project || mongoose.model<IProjectDocument>('Project', ProjectSchema);
