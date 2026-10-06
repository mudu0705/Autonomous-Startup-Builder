import mongoose, { Schema, Document } from 'mongoose';

export interface ISourceDocument extends Document {
  analysisId: mongoose.Types.ObjectId;
  agentId: string;
  title: string;
  url?: string;
  domain?: string;
  snippet?: string;
  reliabilityScore?: number;
  publishedDate?: string;
  retrievedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema = new Schema<ISourceDocument>(
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
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
    },
    domain: {
      type: String,
    },
    snippet: {
      type: String,
    },
    reliabilityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    publishedDate: {
      type: String,
    },
    retrievedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const SourceModel =
  mongoose.models.Source || mongoose.model<ISourceDocument>('Source', SourceSchema);
