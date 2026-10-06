import mongoose, { Schema, Document } from 'mongoose';
import type { IntakeStructuredState, IntakeCategory } from '../../../shared/types/intake.ts';

export interface IConversationDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;
  structuredState: IntakeStructuredState;
  currentCategory: IntakeCategory | 'complete';
  readyForAnalysis: boolean;
  completedCategories: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Intake Conversation',
    },
    messages: [
      {
        role: {
          type: String,
          enum: ['user', 'assistant', 'system'],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          type: Schema.Types.Mixed,
        },
      },
    ],
    structuredState: {
      type: Schema.Types.Mixed,
      default: () => ({
        startupIdea: null,
        proposedSolution: null,
        startupName: null,
        targetCustomers: null,
        location: { country: 'India', scope: null, locations: [] },
        budget: { amount: null, minAmount: null, maxAmount: null, currency: 'INR', source: null, confidence: null },
        revenueModel: null,
        additionalInformation: null,
        analysisDepth: null,
      }),
    },
    currentCategory: {
      type: String,
      default: 'startupIdea',
    },
    readyForAnalysis: {
      type: Boolean,
      default: false,
    },
    completedCategories: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const ConversationModel =
  mongoose.models.Conversation ||
  mongoose.model<IConversationDocument>('Conversation', ConversationSchema);

