import type { AgentMetadata, AgentId } from '../../../shared/types/agent.ts';

/**
 * Architectural specification for the 9 specialized agents in the Autonomous Startup Builder pipeline.
 *
 * NOTE: Phase 1 is STRICTLY FOUNDATION-ONLY.
 * None of the agents below are implemented in Phase 1.
 * All 9 agents are scheduled for implementation in Phase 3 (Multi-Agent Pipeline & Intelligence Engine).
 */
export const AGENT_REGISTRY: Record<AgentId, AgentMetadata> = {
  idea_problem: {
    id: 'idea_problem',
    name: 'Idea & Problem Agent',
    order: 1,
    targetPhase: 3,
    isImplemented: false,
    description: 'Deconstructs the core value proposition, problem severity, and hypothesis clarity.',
    dependsOn: [],
  },
  market_research: {
    id: 'market_research',
    name: 'Market Research Agent',
    order: 2,
    targetPhase: 3,
    isImplemented: false,
    description: 'Evaluates Total Addressable Market (TAM, SAM, SOM), macroeconomic trends, and industry drivers.',
    dependsOn: ['idea_problem'],
  },
  competitor_analysis: {
    id: 'competitor_analysis',
    name: 'Competitor Analysis Agent',
    order: 3,
    targetPhase: 3,
    isImplemented: false,
    description: 'Maps direct and indirect competitors, moats, feature matrices, and differentiation gaps.',
    dependsOn: ['idea_problem', 'market_research'],
  },
  customer_validation: {
    id: 'customer_validation',
    name: 'Customer & Validation Agent',
    order: 4,
    targetPhase: 3,
    isImplemented: false,
    description: 'Profiles ideal buyer personas, pain points, willingness to pay, and interview synthesis.',
    dependsOn: ['idea_problem', 'market_research'],
  },
  business_model: {
    id: 'business_model',
    name: 'Business Model Agent',
    order: 5,
    targetPhase: 3,
    isImplemented: false,
    description: 'Architects revenue streams, pricing mechanics, distribution channels, and unit economics.',
    dependsOn: ['customer_validation', 'competitor_analysis'],
  },
  finance_budget: {
    id: 'finance_budget',
    name: 'Finance & Budget Agent',
    order: 6,
    targetPhase: 3,
    isImplemented: false,
    description: 'Calculates 24-month pro-forma projections, burn rates, runway scenarios, and capital requirements.',
    dependsOn: ['business_model'],
  },
  mvp_product: {
    id: 'mvp_product',
    name: 'MVP / Product Agent',
    order: 7,
    targetPhase: 3,
    isImplemented: false,
    description: 'Specifies the minimal viable product feature set, sprint timeline, and technical feasibility.',
    dependsOn: ['customer_validation', 'business_model'],
  },
  risk_feasibility: {
    id: 'risk_feasibility',
    name: 'Risk & Feasibility Agent',
    order: 8,
    targetPhase: 3,
    isImplemented: false,
    description: 'Analyzes regulatory, technical, market timing, execution, and legal vulnerability risks.',
    dependsOn: ['mvp_product', 'finance_budget'],
  },
  strategy: {
    id: 'strategy',
    name: 'Strategy Agent',
    order: 9,
    targetPhase: 3,
    isImplemented: false,
    description: 'Synthesizes all findings into a master go-to-market playbook and strategic milestones.',
    dependsOn: ['risk_feasibility', 'finance_budget', 'mvp_product'],
  },
};

export function getOrderedAgents(): AgentMetadata[] {
  return Object.values(AGENT_REGISTRY).sort((a, b) => a.order - b.order);
}

export function getAgentById(id: AgentId): AgentMetadata | undefined {
  return AGENT_REGISTRY[id];
}
