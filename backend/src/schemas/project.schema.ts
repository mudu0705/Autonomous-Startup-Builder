/**
 * Backend-only project schema aliases — delegates to shared/schemas for consistency.
 * The old ProjectResponseSchema with description/stage/status fields is superseded
 * by the Project interface in shared/types/project.ts.
 */
export { ProjectCreateSchema, ProjectUpdateSchema } from '../../../shared/schemas/index.ts';
