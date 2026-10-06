import mongoose from 'mongoose';
import { ConversationModel, IConversationDocument } from '../models/Conversation.ts';
import { ProjectModel } from '../models/Project.ts';
import type {
  IntakeStructuredState,
  IntakeCategory,
  IntakeProgress,
  IntakeMessageResponse,
  IntakeConversationData,
} from '../../../shared/types/intake.ts';
import { extractIntakeInformation } from './intake.extractor.ts';
import { NotFoundError } from '../utils/errors.ts';
import { logger } from '../config/logger.ts';

const INTAKE_QUESTIONS: Record<IntakeCategory, string> = {
  startupIdea: 'What is your startup idea? Describe the core problem you are looking to solve.',
  proposedSolution: 'What is your proposed solution or product? How will it work for your users?',
  startupName: 'What is the working name of your startup? (Optional — say "I don\'t have one yet" if undecided)',
  targetCustomers: 'Who are your target customers in India? (e.g. college students, MSME owners, rural farmers)',
  location: 'Where do you plan to launch your startup in India? (Options: All India, Specific State, Specific City, or Region)',
  budget: 'What is your estimated starting budget in INR? (e.g. ₹5 Lakhs, ₹10-25 Lakhs, or "I\'m not sure" for AI estimation)',
  revenueModel: 'How do you plan to make money from this startup? (Optional — e.g. SaaS subscription, commission, or "I don\'t know yet")',
  additionalInformation: 'Tell us anything else you think is important about your startup (team, timeline, moat, etc. Optional)',
  analysisDepth: 'How detailed would you like the analysis to be? (Quick, Standard, or Deep)',
};

const CATEGORY_ORDER: IntakeCategory[] = [
  'startupIdea',
  'proposedSolution',
  'startupName',
  'targetCustomers',
  'location',
  'budget',
  'revenueModel',
  'additionalInformation',
  'analysisDepth',
];

const REQUIRED_CATEGORIES: IntakeCategory[] = [
  'startupIdea',
  'proposedSolution',
  'targetCustomers',
  'location',
  'budget',
  'analysisDepth',
];

export class ConversationService {
  /**
   * Evaluates which categories are satisfied and calculates completion progress.
   */
  public evaluateProgress(state: IntakeStructuredState): {
    completedCategories: IntakeCategory[];
    progress: IntakeProgress;
    readyForAnalysis: boolean;
  } {
    const completed: IntakeCategory[] = [];

    if (state.startupIdea && state.startupIdea.trim().length >= 5) {
      completed.push('startupIdea');
    }
    if (state.proposedSolution && state.proposedSolution.trim().length >= 5) {
      completed.push('proposedSolution');
    }
    if (state.startupName !== null && state.startupName !== undefined) {
      completed.push('startupName');
    }
    if (state.targetCustomers && state.targetCustomers.trim().length >= 3) {
      completed.push('targetCustomers');
    }
    if (state.location && state.location.scope) {
      completed.push('location');
    }
    if (state.budget && (state.budget.amount !== null || state.budget.source !== null)) {
      completed.push('budget');
    }
    if (state.revenueModel !== null && state.revenueModel !== undefined) {
      completed.push('revenueModel');
    }
    if (state.additionalInformation !== null && state.additionalInformation !== undefined) {
      completed.push('additionalInformation');
    }
    if (state.analysisDepth) {
      completed.push('analysisDepth');
    }

    const requiredCompleted = REQUIRED_CATEGORIES.filter((c) => completed.includes(c)).length;
    const readyForAnalysis = requiredCompleted === REQUIRED_CATEGORIES.length;
    const percentage = Math.round((completed.length / 9) * 100);

    return {
      completedCategories: completed,
      progress: {
        completed: completed.length,
        total: 9,
        percentage,
        requiredCompleted,
        totalRequired: 6,
      },
      readyForAnalysis,
    };
  }

  /**
   * Determines the next best question to ask the user.
   * Prioritizes missing required fields first, then optional fields.
   */
  public getNextQuestion(
    state: IntakeStructuredState,
    completed: IntakeCategory[]
  ): { category: IntakeCategory | 'complete'; question: string } {
    // 1. First check missing required categories
    for (const cat of REQUIRED_CATEGORIES) {
      if (!completed.includes(cat)) {
        return {
          category: cat,
          question: INTAKE_QUESTIONS[cat],
        };
      }
    }

    // 2. Next check missing optional categories
    for (const cat of CATEGORY_ORDER) {
      if (!completed.includes(cat)) {
        return {
          category: cat,
          question: INTAKE_QUESTIONS[cat],
        };
      }
    }

    // 3. All 9 completed
    return {
      category: 'complete',
      question: 'All startup information has been successfully collected! Review your details below.',
    };
  }

  /**
   * Retrieves or initializes the intake conversation document for a project.
   */
  public async getOrCreateConversation(
    projectId: string,
    userId: string
  ): Promise<IConversationDocument> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new NotFoundError('Project not found');
    }

    // Validate project ownership
    const project = await ProjectModel.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!project) {
      throw new NotFoundError('Project not found or unauthorized');
    }

    let conversation = await ConversationModel.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!conversation) {
      const initialState: IntakeStructuredState = {
        startupIdea: project.startupIdea || null,
        proposedSolution: project.proposedSolution || null,
        startupName: project.name || null,
        targetCustomers: project.targetCustomers || null,
        location: project.location
          ? {
              country: 'India',
              scope: project.location.scope || null,
              locations: project.location.locations || [],
              source: 'user_provided',
            }
          : { country: 'India', scope: null, locations: [] },
        budget: project.budget
          ? {
              amount: project.budget.amount,
              minAmount: null,
              maxAmount: null,
              currency: 'INR',
              source: project.budget.source === 'AI_ESTIMATED' ? 'ai_estimated' : 'user_provided',
              confidence: 1,
            }
          : { amount: null, minAmount: null, maxAmount: null, currency: 'INR', source: null, confidence: null },
        revenueModel: project.revenueModel || null,
        additionalInformation: project.additionalInformation || null,
        analysisDepth: project.analysisDepth || null,
        fieldSources: {
          startupIdea: project.startupIdea ? 'user_provided' : undefined,
          startupName: project.name ? 'user_provided' : undefined,
        },
      };

      const { completedCategories, readyForAnalysis } = this.evaluateProgress(initialState);
      const next = this.getNextQuestion(initialState, completedCategories);

      conversation = await ConversationModel.create({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
        title: `${project.name || 'Startup'} Intake`,
        messages: [
          {
            role: 'assistant',
            content: `Welcome to the Autonomous Startup Builder intake! ${next.question}`,
            timestamp: new Date(),
          },
        ],
        structuredState: initialState,
        currentCategory: next.category,
        readyForAnalysis,
        completedCategories,
      });

      logger.info('Initialized new intake conversation', { projectId, userId });
    }

    return conversation;
  }

  /**
   * Processes a user message, extracts structured information, updates state, and generates the next question.
   */
  public async handleUserMessage(
    projectId: string,
    userId: string,
    message: string
  ): Promise<IntakeMessageResponse> {
    const conversation = await this.getOrCreateConversation(projectId, userId);
    const currentState = conversation.structuredState;
    const currentCategory = conversation.currentCategory;

    // 1. Perform smart extraction
    const extractionResult = await extractIntakeInformation(message, currentCategory, currentState);

    // 2. Merge extracted data into structured state (latest user input takes precedence for corrections)
    const updatedState: IntakeStructuredState = {
      ...currentState,
      ...extractionResult.extracted,
      location: extractionResult.extracted.location || currentState.location,
      budget: extractionResult.extracted.budget || currentState.budget,
      fieldSources: {
        ...(currentState.fieldSources || {}),
        ...extractionResult.fieldSources,
      },
    };

    // 3. Evaluate new progress & completion
    const { completedCategories, progress, readyForAnalysis } = this.evaluateProgress(updatedState);
    const next = this.getNextQuestion(updatedState, completedCategories);

    // 4. Append messages to conversation history
    const userMsg = {
      role: 'user' as const,
      content: message,
      timestamp: new Date(),
    };

    const assistantMsg = {
      role: 'assistant' as const,
      content: readyForAnalysis
        ? `${extractionResult.assistantMessage} All required information has been collected! You can now review your startup details.`
        : `${extractionResult.assistantMessage} ${next.question}`,
      timestamp: new Date(),
    };

    conversation.messages.push(userMsg, assistantMsg);
    conversation.structuredState = updatedState;
    conversation.currentCategory = next.category;
    conversation.readyForAnalysis = readyForAnalysis;
    conversation.completedCategories = completedCategories;
    await conversation.save();

    // 5. Synchronize with Project document
    await this.syncProjectDocument(projectId, userId, updatedState, progress.percentage, readyForAnalysis);

    return {
      message: assistantMsg.content,
      extraction: extractionResult.extracted,
      state: updatedState,
      nextQuestion: next.question,
      currentCategory: next.category,
      progress,
      readyForAnalysis,
    };
  }

  /**
   * Synchronizes extracted intake state with the main MongoDB Project document.
   */
  public async syncProjectDocument(
    projectId: string,
    userId: string,
    state: IntakeStructuredState,
    progressPercentage: number,
    readyForAnalysis: boolean
  ): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      intakeProgress: progressPercentage,
      status: readyForAnalysis ? 'READY_FOR_ANALYSIS' : 'INTAKE_IN_PROGRESS',
    };

    if (state.startupName) updatePayload.name = state.startupName;
    if (state.startupIdea) updatePayload.startupIdea = state.startupIdea;
    if (state.proposedSolution) updatePayload.proposedSolution = state.proposedSolution;
    if (state.targetCustomers) updatePayload.targetCustomers = state.targetCustomers;
    if (state.revenueModel) updatePayload.revenueModel = state.revenueModel;
    if (state.additionalInformation) updatePayload.additionalInformation = state.additionalInformation;
    if (state.analysisDepth) updatePayload.analysisDepth = state.analysisDepth;

    if (state.location && state.location.scope) {
      updatePayload.location = {
        country: 'India',
        scope: state.location.scope,
        locations: state.location.locations,
      };
    }

    if (state.budget) {
      updatePayload.budget = {
        amount: state.budget.amount,
        currency: 'INR',
        source: state.budget.source === 'ai_estimated' ? 'AI_ESTIMATED' : 'USER',
        isCertain: state.budget.source !== 'ai_estimated',
      };
    }

    await ProjectModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: updatePayload }
    );
  }

  /**
   * Loads saved conversation and structured intake state.
   */
  public async getConversationData(
    projectId: string,
    userId: string
  ): Promise<IntakeConversationData> {
    const conversation = await this.getOrCreateConversation(projectId, userId);
    const { completedCategories, progress, readyForAnalysis } = this.evaluateProgress(
      conversation.structuredState
    );
    const next = this.getNextQuestion(conversation.structuredState, completedCategories);

    return {
      projectId: conversation.projectId.toString(),
      userId: conversation.userId.toString(),
      messages: conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
      })),
      state: conversation.structuredState,
      currentCategory: next.category,
      nextQuestion: next.question,
      progress,
      readyForAnalysis,
    };
  }

  /**
   * Resets the intake conversation and state for a project without deleting the project.
   */
  public async resetConversation(projectId: string, userId: string): Promise<IntakeConversationData> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new NotFoundError('Project not found');
    }

    await ConversationModel.deleteOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
    });

    await ProjectModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: {
          proposedSolution: undefined,
          targetCustomers: undefined,
          revenueModel: undefined,
          additionalInformation: undefined,
          intakeProgress: 0,
          status: 'DRAFT',
        },
      }
    );

    const cleanState: IntakeStructuredState = {
      startupIdea: null,
      proposedSolution: null,
      startupName: null,
      targetCustomers: null,
      location: { country: 'India', scope: null, locations: [] },
      budget: { amount: null, minAmount: null, maxAmount: null, currency: 'INR', source: null, confidence: null },
      revenueModel: null,
      additionalInformation: null,
      analysisDepth: null,
      fieldSources: {},
    };

    await ConversationModel.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
      title: 'Startup Intake',
      messages: [
        {
          role: 'assistant',
          content: `Welcome to the Autonomous Startup Builder intake! ${INTAKE_QUESTIONS.startupIdea}`,
          timestamp: new Date(),
        },
      ],
      structuredState: cleanState,
      currentCategory: 'startupIdea',
      readyForAnalysis: false,
      completedCategories: [],
    });

    return await this.getConversationData(projectId, userId);
  }

  /**
   * Confirms the project intake and marks it ready for analysis (without starting Phase 3 agents).
   */
  public async confirmIntake(projectId: string, userId: string): Promise<{ success: boolean; status: string }> {
    const conversation = await this.getOrCreateConversation(projectId, userId);
    const { readyForAnalysis } = this.evaluateProgress(conversation.structuredState);

    if (!readyForAnalysis) {
      throw new Error('All 6 required categories must be completed before confirming intake.');
    }

    await ProjectModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        $set: {
          status: 'READY_FOR_ANALYSIS',
          intakeProgress: 100,
        },
      }
    );

    conversation.readyForAnalysis = true;
    await conversation.save();

    logger.info('Project intake confirmed and marked READY_FOR_ANALYSIS', { projectId, userId });
    return { success: true, status: 'READY_FOR_ANALYSIS' };
  }
}

export const conversationService = new ConversationService();
