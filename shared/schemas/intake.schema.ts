import { z } from 'zod';

export const IntakeMessageInputSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(5000),
});

export const IntakeCategorySchema = z.enum([
  'startupIdea',
  'proposedSolution',
  'startupName',
  'targetCustomers',
  'location',
  'budget',
  'revenueModel',
  'additionalInformation',
  'analysisDepth',
]);

export const IntakeLocationSchema = z.object({
  country: z.literal('India').default('India'),
  scope: z.enum(['national', 'state', 'city', 'region']).nullable(),
  locations: z.array(z.string()).default([]),
  source: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
});

export const IntakeBudgetSchema = z.object({
  amount: z.number().nullable().default(null),
  minAmount: z.number().nullable().default(null),
  maxAmount: z.number().nullable().default(null),
  currency: z.literal('INR').default('INR'),
  source: z.enum(['user_provided', 'ai_estimated']).nullable().default(null),
  confidence: z.number().nullable().default(null),
});

export const IntakeStructuredStateSchema = z.object({
  startupIdea: z.string().nullable().default(null),
  proposedSolution: z.string().nullable().default(null),
  startupName: z.string().nullable().default(null),
  targetCustomers: z.string().nullable().default(null),
  location: IntakeLocationSchema,
  budget: IntakeBudgetSchema,
  revenueModel: z.string().nullable().default(null),
  additionalInformation: z.string().nullable().default(null),
  analysisDepth: z.enum(['quick', 'standard', 'deep']).nullable().default(null),
  fieldSources: z
    .object({
      startupIdea: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
      proposedSolution: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
      startupName: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
      targetCustomers: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
      location: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
      budget: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
      revenueModel: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
      additionalInformation: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
      analysisDepth: z.enum(['user_provided', 'ai_inferred', 'ai_estimated']).optional(),
    })
    .optional(),
});

export const IntakeProgressSchema = z.object({
  completed: z.number().min(0).max(9),
  total: z.literal(9),
  percentage: z.number().min(0).max(100),
  requiredCompleted: z.number().min(0).max(6),
  totalRequired: z.literal(6),
});

export const IntakeMessageResponseSchema = z.object({
  message: z.string(),
  extraction: IntakeStructuredStateSchema.partial(),
  state: IntakeStructuredStateSchema,
  nextQuestion: z.string(),
  currentCategory: z.union([IntakeCategorySchema, z.literal('complete')]),
  progress: IntakeProgressSchema,
  readyForAnalysis: z.boolean(),
});

export type IntakeMessageInput = z.infer<typeof IntakeMessageInputSchema>;
