import mongoose, { Schema, Document } from 'mongoose';

export interface IReportDocument extends Document {
  analysisId: mongoose.Types.ObjectId;
  title: string;
  executiveSummary: string;
  sections: Array<{
    title: string;
    agentId: string;
    summary: string;
    keyFindings: string[];
    recommendations: string[];
  }>;
  generatedAt: Date;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReportDocument>(
  {
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'Analysis',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    executiveSummary: {
      type: String,
      required: true,
    },
    sections: [
      {
        title: { type: String, required: true },
        agentId: { type: String, required: true },
        summary: { type: String, required: true },
        keyFindings: [{ type: String }],
        recommendations: [{ type: String }],
      },
    ],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    pdfUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const ReportModel =
  mongoose.models.Report || mongoose.model<IReportDocument>('Report', ReportSchema);
