import mongoose, { Schema, Document } from 'mongoose';

export interface IScoreDocument extends Document {
  analysisId: mongoose.Types.ObjectId;
  overallScore: number;
  verdict: 'high_potential' | 'viable_with_adjustments' | 'high_risk' | 'unviable';
  categories: Array<{
    category: string;
    weight: number;
    score: number;
    maxScore: number;
    factors: Array<{
      factor: string;
      points: number;
      explanation: string;
    }>;
  }>;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScoreSchema = new Schema<IScoreDocument>(
  {
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'Analysis',
      required: true,
      index: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    verdict: {
      type: String,
      enum: ['high_potential', 'viable_with_adjustments', 'high_risk', 'unviable'],
      required: true,
    },
    categories: [
      {
        category: { type: String, required: true },
        weight: { type: Number, required: true },
        score: { type: Number, required: true },
        maxScore: { type: Number, required: true },
        factors: [
          {
            factor: { type: String, required: true },
            points: { type: Number, required: true },
            explanation: { type: String, required: true },
          },
        ],
      },
    ],
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const ScoreModel =
  mongoose.models.Score || mongoose.model<IScoreDocument>('Score', ScoreSchema);
