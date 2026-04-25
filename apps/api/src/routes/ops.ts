import type { FastifyPluginAsync } from 'fastify';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import {
  auditRepo,
  executionRepo,
  intentRepo,
  metricsRepo,
  policyRepo,
  simulationRepo,
  strategyRepo,
  strategies as strategiesTable,
} from '@keeta-agent-stack/storage';
import { requireAdminAccess, requireOperatorAccess } from '../lib/auth.js';

function strategyPolicyPackId(config: unknown): string | null {
  if (!config || typeof config !== 'object') {
    return null;
  }
  const value = (config as Record<string, unknown>).policyPackId;
  return typeof value === 'string' ? value : null;
}

function dateIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function withinHours(value: Date | string, hours: number): boolean {
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(t) && t >= Date.now() - hours * 3_600_000;
}

function countBy<T>(rows: T[], key: (row: T) => string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row) ?? 'unknown';
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function policyOutcome(payload: unknown): 'allowed' | 'blocked' | 'unknown' {
  if (!payload || typeof payload !== 'object') return 'unknown';
  const record = payload as Record<string, unknown>;
  if (record.allowed === true || record.outcome === 'allowed' || record.decision === 'allowed')
    return 'allowed';
  if (record.allowed === false || record.outcome === 'blocked' || record.decision === 'blocked')
    return 'blocked';
  return 'unknown';
}

function simulationFidelity(scenario: unknown): string {
  if (!scenario || typeof scenario !== 'object') return 'standard';
  const value = (scenario as Record<string, unknown>).fidelityMode;
  return typeof value === 'string' ? value : 'standard';
}

type StrategyRow = NonNullable<Awaited<ReturnType<typeof strategyRepo.getStrategyById>>>;

function listStrategies(db: Parameters<typeof strategyRepo.getStrategyById>[0], limit = 500) {
  return db.select().from(strategiesTable).orderBy(desc(strategiesTable.createdAt)).limit(limit);
}

function strategyResponse(row: StrategyRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isTemplate: row.isTemplate,
    paused: row.paused,
    policyPackId: strategyPolicyPackId(row.config),
    createdAt: dateIso(row.createdAt),
    config: row.config,
  };
}

export const opsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ops/metrics', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const rows = await metricsRepo.listRecentMetricSamples(app.db, 500);
    return { samples: rows };
  });

  app.get('/ops/dashboard-summary', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }

    const [
      strategies,
      intents,
      executions,
      policyDecisions,
      simulationRuns,
      adapterHealth,
      events,
      metrics,
    ] = await Promise.all([
      listStrategies(app.db, 500),
      intentRepo.listIntents(app.db, 500),
      executionRepo.listExecutions(app.db, 500),
      policyRepo.listRecentPolicyDecisions(app.db, 500),
      simulationRepo.listSimulationRuns(app.db, 500),
      app.registry.healthAll(),
      auditRepo.listRecentAuditEvents(app.db, 12),
      metricsRepo.listRecentMetricSamples(app.db, 100),
    ]);

    const agentRows = strategies.filter((strategy) => !strategy.isTemplate);
    const activeAgents = agentRows.filter((strategy) => !strategy.paused);
    const executions24h = executions.filter((row) => withinHours(row.createdAt, 24));
    const intents24h = intents.filter((row) => withinHours(row.createdAt, 24));
    const successfulExecutions = executions.filter((row) =>
      ['settled', 'completed', 'confirmed'].includes(row.status)
    );
    const failedExecutions = executions.filter((row) =>
      ['failed', 'reverted', 'cancelled'].includes(row.status)
    );
    const unsettledExecutions = executions.filter((row) =>
      ['pending', 'submitted', 'queued'].includes(row.status)
    );
    const policyOutcomes = policyDecisions.map((row) => policyOutcome(row.payload));
    const blockedPolicies = policyOutcomes.filter((outcome) => outcome === 'blocked').length;
    const allowedPolicies = policyOutcomes.filter((outcome) => outcome === 'allowed').length;
    const adapterFailures = adapterHealth.filter((row) => !row.ok);
    const latestMetric = metrics[0];

    return {
      generatedAt: new Date().toISOString(),
      windowHours: 24,
      agents: {
        total: agentRows.length,
        active: activeAgents.length,
        paused: agentRows.length - activeAgents.length,
        templates: strategies.filter((strategy) => strategy.isTemplate).length,
        recent: agentRows.slice(0, 6).map(strategyResponse),
      },
      intents: {
        totalRecent: intents.length,
        last24h: intents24h.length,
        held: intents.filter((row) => row.status === 'held').length,
        pendingApprovals: intents.filter((row) => row.approvalStatus === 'pending').length,
        byStatus: countBy(intents, (row) => row.status),
        latest: intents[0]
          ? {
              id: intents[0].id,
              status: intents[0].status,
              createdAt: dateIso(intents[0].createdAt),
            }
          : null,
      },
      executions: {
        totalRecent: executions.length,
        last24h: executions24h.length,
        unsettled: unsettledExecutions.length,
        succeeded: successfulExecutions.length,
        failed: failedExecutions.length,
        successRate:
          successfulExecutions.length + failedExecutions.length > 0
            ? Math.round(
                (successfulExecutions.length /
                  (successfulExecutions.length + failedExecutions.length)) *
                  1000
              ) / 10
            : 0,
        byStatus: countBy(executions, (row) => row.status),
      },
      policy: {
        decisions: policyDecisions.length,
        allowed: allowedPolicies,
        blocked: blockedPolicies,
        blockRate:
          policyDecisions.length > 0
            ? Math.round((blockedPolicies / policyDecisions.length) * 1000) / 10
            : 0,
      },
      adapters: {
        total: adapterHealth.length,
        degraded: adapterFailures.length,
        items: adapterHealth,
      },
      simulations: {
        totalRecent: simulationRuns.length,
        completed: simulationRuns.filter((row) => row.status === 'completed').length,
        failed: simulationRuns.filter((row) => row.status === 'failed').length,
        fidelityModes: countBy(simulationRuns, (row) => simulationFidelity(row.scenario)),
      },
      events: events.map((row) => ({
        id: row.id,
        eventType: row.eventType,
        intentId: row.intentId,
        payload: row.payload,
        createdAt: dateIso(row.createdAt),
      })),
      metrics: {
        samples: metrics.length,
        latest: latestMetric
          ? {
              name: latestMetric.name,
              value: latestMetric.value,
              labels: latestMetric.labels,
              capturedAt: dateIso(latestMetric.capturedAt),
            }
          : null,
      },
    };
  });

  app.get('/ops/agents', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const rows = await listStrategies(app.db, 500);
    return {
      agents: rows.filter((row) => !row.isTemplate).map(strategyResponse),
      templates: rows.filter((row) => row.isTemplate).map(strategyResponse),
    };
  });

  app.get('/ops/agents/:id', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const row = await strategyRepo.getStrategyById(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    }
    const intents = (await intentRepo.listIntents(app.db, 500)).filter(
      (intent) => intent.strategyId === id
    );
    const intentIds = new Set(intents.map((intent) => intent.id));
    const executions = (await executionRepo.listExecutions(app.db, 500)).filter((execution) =>
      intentIds.has(execution.intentId)
    );
    return {
      agent: strategyResponse(row),
      intents: {
        totalRecent: intents.length,
        byStatus: countBy(intents, (intent) => intent.status),
      },
      executions: {
        totalRecent: executions.length,
        byStatus: countBy(executions, (execution) => execution.status),
      },
    };
  });

  app.post('/ops/strategies/:id/pause', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    await strategyRepo.setStrategyPaused(app.db, id, true);
    return reply.status(204).send();
  });

  app.post('/ops/strategies/:id/unpause', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    await strategyRepo.setStrategyPaused(app.db, id, false);
    return reply.status(204).send();
  });

  app.get('/ops/strategies/:id/policy-pack', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const strategy = await strategyRepo.getStrategyById(app.db, id);
    if (!strategy) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Strategy not found' } });
    }
    return {
      strategyId: id,
      policyPackId: strategyPolicyPackId(strategy.config),
    };
  });

  app.put('/ops/strategies/:id/policy-pack', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = z
      .object({
        policyPackId: z.string().uuid(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const pack = await policyRepo.getPolicyPackById(app.db, parsed.data.policyPackId);
    if (!pack) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Policy pack not found' } });
    }
    const updated = await strategyRepo.setStrategyPolicyPackId(
      app.db,
      id,
      parsed.data.policyPackId
    );
    if (!updated) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Strategy not found' } });
    }
    return {
      strategyId: id,
      policyPackId: strategyPolicyPackId(updated.config),
    };
  });

  app.delete('/ops/strategies/:id/policy-pack', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const updated = await strategyRepo.setStrategyPolicyPackId(app.db, id, null);
    if (!updated) {
      return reply
        .status(404)
        .send({ error: { code: 'NOT_FOUND', message: 'Strategy not found' } });
    }
    return {
      strategyId: id,
      policyPackId: null,
    };
  });
};
