import mongoose, { Schema, Document } from 'mongoose';

export interface ILogDocument extends Document {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, unknown>;
  userId?: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  analysisId?: mongoose.Types.ObjectId;
  agentId?: string;
  timestamp: Date;
}

const LogSchema = new Schema<ILogDocument>(
  {
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    context: {
      type: Schema.Types.Mixed,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'Analysis',
      index: true,
    },
    agentId: {
      type: String,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LogModel = mongoose.models.Log || mongoose.model<ILogDocument>('Log', LogSchema);
