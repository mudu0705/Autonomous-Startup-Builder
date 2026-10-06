export type LocationScope = 'national' | 'state' | 'city' | 'region';
export type BudgetSource = 'USER' | 'AI_ESTIMATED';
export type AnalysisDepth = 'quick' | 'standard' | 'deep';
export type ProjectStatus =
  | 'DRAFT'
  | 'INTAKE_IN_PROGRESS'
  | 'READY_FOR_ANALYSIS'
  | 'ANALYSIS_RUNNING'
  | 'ANALYSIS_COMPLETED'
  | 'FAILED';

export interface ProjectLocation {
  country: 'India';
  scope: LocationScope;
  locations: string[];
}

export interface ProjectBudget {
  amount: number | null;
  currency: 'INR';
  source: BudgetSource | null;
  isCertain: boolean;
}

export interface Project {
  id: string;
  userId: string;
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
  createdAt: string;
  updatedAt: string;
}

