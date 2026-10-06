import type { AgentId } from '../../../shared/types/agent.ts';
import type { AgentContext, AgentOutputPayload } from './types.ts';

/**
 * Common architectural interface for all 9 specialized AI agents in the Autonomous Startup Builder pipeline.
 *
 * Extension point only: No agents are implemented in Phase 1.
 * Actual execution logic will be implemented in Phase 3.
 */
export interface IBaseAgent {
  readonly id: AgentId;
  readonly name: string;
  readonly order: number;
  readonly description: string;
  readonly targetPhase: number;
  readonly isImplemented: boolean;
  readonly dependsOn: AgentId[];

  execute(context: AgentContext): Promise<AgentOutputPayload>;
}
