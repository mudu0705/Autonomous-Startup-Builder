import mongoose from 'mongoose';
import { ProjectModel, IProjectDocument } from '../models/Project.ts';
import type { Project } from '../../../shared/types/project.ts';
import type { UserRole } from '../../../shared/types/user.ts';
import type { ProjectCreateInput, ProjectUpdateInput } from '../../../shared/schemas/index.ts';
import { ProjectCreateSchema, ProjectUpdateSchema } from '../../../shared/schemas/index.ts';
import { NotFoundError, ValidationError } from '../utils/errors.ts';
import { logger } from '../config/logger.ts';

/**
 * Maps raw Mongoose IProjectDocument to typed safe Project representation.
 */
export function toSafeProject(doc: IProjectDocument): Project {
  return {
    id: doc._id ? doc._id.toString() : String(doc.id || doc._id),
    userId: doc.userId ? doc.userId.toString() : String(doc.userId),
    name: doc.name,
    startupIdea: doc.startupIdea,
    proposedSolution: doc.proposedSolution,
    targetCustomers: doc.targetCustomers,
    location: doc.location || { country: 'India', scope: 'national', locations: [] },
    budget: doc.budget || { amount: null, currency: 'INR', source: 'USER', isCertain: true },
    revenueModel: doc.revenueModel,
    additionalInformation: doc.additionalInformation,
    analysisDepth: doc.analysisDepth || 'standard',
    status: doc.status || 'DRAFT',
    intakeProgress: doc.intakeProgress ?? 0,
    score: doc.score ?? null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export class ProjectService {
  /**
   * Creates a new startup project document owned strictly by the authenticated user.
   */
  async createProject(userId: string, input: ProjectCreateInput): Promise<Project> {
    const parseResult = ProjectCreateSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid project data payload', parseResult.error.format());
    }

    const validatedData = parseResult.data;

    const doc = await ProjectModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: validatedData.name.trim(),
      startupIdea: validatedData.startupIdea.trim(),
      proposedSolution: validatedData.proposedSolution?.trim(),
      targetCustomers: validatedData.targetCustomers?.trim(),
      location: validatedData.location,
      budget: validatedData.budget,
      revenueModel: validatedData.revenueModel?.trim(),
      additionalInformation: validatedData.additionalInformation?.trim(),
      analysisDepth: validatedData.analysisDepth,
      status: 'DRAFT',
      intakeProgress: 0,
      score: null,
    });

    logger.info('Project created successfully', { projectId: doc._id.toString(), userId });
    return toSafeProject(doc);
  }

  /**
   * Retrieves projects owned by user (or all projects if admin requests showAll).
   */
  async getUserProjects(userId: string, role?: UserRole, showAll?: boolean): Promise<Project[]> {
    const filter = (role === 'admin' && showAll)
      ? {}
      : { userId: new mongoose.Types.ObjectId(userId) };

    const docs = await ProjectModel.find(filter).sort({ createdAt: -1 });

    return docs.map(toSafeProject);
  }

  /**
   * Retrieves a single project strictly enforcing ownership matching userId (or admin capability).
   */
  async getUserProjectById(userId: string, projectId: string, role?: UserRole): Promise<Project> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new NotFoundError('Project not found');
    }

    const filter: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(projectId),
    };

    if (role !== 'admin') {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    const doc = await ProjectModel.findOne(filter);

    if (!doc) {
      throw new NotFoundError('Project not found');
    }

    return toSafeProject(doc);
  }

  /**
   * Updates allowed project fields for a project owned by user (or admin).
   */
  async updateUserProject(
    userId: string,
    projectId: string,
    input: ProjectUpdateInput,
    role?: UserRole
  ): Promise<Project> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new NotFoundError('Project not found');
    }

    const parseResult = ProjectUpdateSchema.safeParse(input);
    if (!parseResult.success) {
      throw new ValidationError('Invalid update parameters', parseResult.error.format());
    }

    const updateData = parseResult.data;

    const filter: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(projectId),
    };

    if (role !== 'admin') {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    const doc = await ProjectModel.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!doc) {
      throw new NotFoundError('Project not found');
    }

    logger.info('Project updated successfully', { projectId, userId });
    return toSafeProject(doc);
  }

  /**
   * Deletes a project owned strictly by user (or admin).
   */
  async deleteUserProject(userId: string, projectId: string, role?: UserRole): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      throw new NotFoundError('Project not found');
    }

    const filter: Record<string, unknown> = {
      _id: new mongoose.Types.ObjectId(projectId),
    };

    if (role !== 'admin') {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    const result = await ProjectModel.deleteOne(filter);

    if (result.deletedCount === 0) {
      throw new NotFoundError('Project not found');
    }

    logger.info('Project deleted successfully', { projectId, userId });
    return true;
  }
}

export const projectService = new ProjectService();
