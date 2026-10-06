import type { AnalysisDepth } from './project.ts';

export type IntakeCategory =
  | 'startupIdea'
  | 'proposedSolution'
  | 'startupName'
  | 'targetCustomers'
  | 'location'
  | 'budget'
  | 'revenueModel'
  | 'additionalInformation'
  | 'analysisDepth';

export type FieldSource = 'user_provided' | 'ai_inferred' | 'ai_estimated';
export type IntakeBudgetSource = 'user_provided' | 'ai_estimated';

export interface IntakeLocation {
  country: 'India';
  scope: 'national' | 'state' | 'city' | 'region' | null;
  locations: string[];
  source?: FieldSource;
}

export interface IntakeBudget {
  amount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  currency: 'INR';
  source: IntakeBudgetSource | null;
  confidence: number | null;
}

export interface IntakeStructuredState {
  startupIdea: string | null;
  proposedSolution: string | null;
  startupName: string | null;
  targetCustomers: string | null;
  location: IntakeLocation;
  budget: IntakeBudget;
  revenueModel: string | null;
  additionalInformation: string | null;
  analysisDepth: AnalysisDepth | null;
  fieldSources?: {
    startupIdea?: FieldSource;
    proposedSolution?: FieldSource;
    startupName?: FieldSource;
    targetCustomers?: FieldSource;
    location?: FieldSource;
    budget?: FieldSource;
    revenueModel?: FieldSource;
    additionalInformation?: FieldSource;
    analysisDepth?: FieldSource;
  };
}

export interface IntakeProgress {
  completed: number;
  total: 9;
  percentage: number;
  requiredCompleted: number;
  totalRequired: number;
}

export interface IntakeMessageResponse {
  message: string;
  extraction: Partial<IntakeStructuredState>;
  state: IntakeStructuredState;
  nextQuestion: string;
  currentCategory: IntakeCategory | 'complete';
  progress: IntakeProgress;
  readyForAnalysis: boolean;
}

export interface IntakeConversationData {
  projectId: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  state: IntakeStructuredState;
  currentCategory: IntakeCategory | 'complete';
  nextQuestion: string;
  progress: IntakeProgress;
  readyForAnalysis: boolean;
}
