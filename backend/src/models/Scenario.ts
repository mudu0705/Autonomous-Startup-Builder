import mongoose, { Schema, Document } from 'mongoose';
import type { ScenarioType } from '../../../shared/types/scenario.ts';

export interface IScenarioDocument extends Document {
  analysisId: mongoose.Types.ObjectId;
  type: ScenarioType;
  title: string;
  assumptions: string[];
  metrics: Array<{
    month: number;
    revenue: number;
    expenses: number;
    burnRate: number;
    cashRunwayMonths: number;
  }>;
  projectedBreakEvenMonth?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScenarioSchema = new Schema<IScenarioDocument>(
  {
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'Analysis',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    assumptions: [{ type: String }],
    metrics: [
      {
        month: { type: Number, required: true },
        revenue: { type: Number, required: true },
        expenses: { type: Number, required: true },
        burnRate: { type: Number, required: true },
        cashRunwayMonths: { type: Number, required: true },
      },
    ],
    projectedBreakEvenMonth: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export const ScenarioModel =
  mongoose.models.Scenario || mongoose.model<IScenarioDocument>('Scenario', ScenarioSchema);
