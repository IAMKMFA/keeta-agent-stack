export interface DashboardSummary {
  generatedAt: string;
  windowHours: number;
  agents: {
    total: number;
    active: number;
    paused: number;
    templates: number;
    recent: AgentSummary[];
  };
  intents: {
    totalRecent: number;
    last24h: number;
    held: number;
    pendingApprovals: number;
    byStatus: Record<string, number>;
    latest: { id: string; status: string; createdAt: string } | null;
  };
  executions: {
    totalRecent: number;
    last24h: number;
    unsettled: number;
    succeeded: number;
    failed: number;
    successRate: number;
    byStatus: Record<string, number>;
  };
  policy: {
    decisions: number;
    allowed: number;
    blocked: number;
    blockRate: number;
  };
  adapters: {
    total: number;
    degraded: number;
    items: Array<{ adapterId: string; ok: boolean; latencyMs?: number; checkedAt?: string }>;
  };
  simulations: {
    totalRecent: number;
    completed: number;
    failed: number;
    fidelityModes: Record<string, number>;
  };
  events: DashboardEvent[];
  metrics: {
    samples: number;
    latest: {
      name: string;
      value: number;
      labels?: Record<string, unknown>;
      capturedAt: string;
    } | null;
  };
}

export interface AgentSummary {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  isTemplate: boolean;
  paused: boolean;
  policyPackId: string | null;
  createdAt: string;
  config: Record<string, unknown>;
}

export interface AgentListResponse {
  agents: AgentSummary[];
  templates: AgentSummary[];
}

export interface DashboardEvent {
  id: string;
  eventType: string;
  intentId?: string | null;
  payload: unknown;
  createdAt: string;
}

export const emptyDashboardSummary: DashboardSummary = {
  generatedAt: new Date(0).toISOString(),
  windowHours: 24,
  agents: { total: 0, active: 0, paused: 0, templates: 0, recent: [] },
  intents: {
    totalRecent: 0,
    last24h: 0,
    held: 0,
    pendingApprovals: 0,
    byStatus: {},
    latest: null,
  },
  executions: {
    totalRecent: 0,
    last24h: 0,
    unsettled: 0,
    succeeded: 0,
    failed: 0,
    successRate: 0,
    byStatus: {},
  },
  policy: { decisions: 0, allowed: 0, blocked: 0, blockRate: 0 },
  adapters: { total: 0, degraded: 0, items: [] },
  simulations: { totalRecent: 0, completed: 0, failed: 0, fidelityModes: {} },
  events: [],
  metrics: { samples: 0, latest: null },
};
