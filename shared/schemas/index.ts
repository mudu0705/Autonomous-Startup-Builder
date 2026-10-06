import { z } from 'zod';

export const HealthQuerySchema = z.object({
  detailed: z.string().optional(),
});

export const UserRegistrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
});

export const UserRegistrationRouteSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const UserLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ProjectLocationSchema = z.object({
  country: z.literal('India').default('India'),
  scope: z.enum(['national', 'state', 'city', 'region']).default('national'),
  locations: z.array(z.string()).default([]),
});

export const ProjectBudgetSchema = z.object({
  amount: z.number().nullable().default(null),
  currency: z.literal('INR').default('INR'),
  source: z.enum(['USER', 'AI_ESTIMATED']).nullable().default('USER'),
  isCertain: z.boolean().default(true),
});

export const ProjectCreateSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100),
  startupIdea: z.string().min(10, 'Startup idea must be at least 10 characters').max(5000),
  proposedSolution: z.string().max(5000).optional(),
  targetCustomers: z.string().max(2000).optional(),
  location: ProjectLocationSchema.optional().default({ country: 'India', scope: 'national', locations: [] }),
  budget: ProjectBudgetSchema.optional().default({ amount: null, currency: 'INR', source: 'USER', isCertain: true }),
  revenueModel: z.string().max(2000).optional(),
  additionalInformation: z.string().max(5000).optional(),
  analysisDepth: z.enum(['quick', 'standard', 'deep']).default('standard'),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(100).optional(),
  startupIdea: z.string().min(10, 'Startup idea must be at least 10 characters').max(5000).optional(),
  proposedSolution: z.string().max(5000).optional(),
  targetCustomers: z.string().max(2000).optional(),
  location: ProjectLocationSchema.optional(),
  budget: ProjectBudgetSchema.optional(),
  revenueModel: z.string().max(2000).optional(),
  additionalInformation: z.string().max(5000).optional(),
  analysisDepth: z.enum(['quick', 'standard', 'deep']).optional(),
  status: z.enum(['DRAFT', 'INTAKE_IN_PROGRESS', 'READY_FOR_ANALYSIS', 'ANALYSIS_RUNNING', 'ANALYSIS_COMPLETED', 'FAILED']).optional(),
  intakeProgress: z.number().min(0).max(100).optional(),
});

export type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>;
export type UserRegistrationRouteInput = z.infer<typeof UserRegistrationRouteSchema>;
export type UserLoginInput = z.infer<typeof UserLoginSchema>;
export type ProjectLocationInput = z.infer<typeof ProjectLocationSchema>;
export type ProjectBudgetInput = z.infer<typeof ProjectBudgetSchema>;
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>;

export * from './intake.schema.ts';

