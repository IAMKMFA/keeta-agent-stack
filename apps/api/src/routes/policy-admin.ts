import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  AnchorBondStatusSchema,
  ExecutionIntentSchema,
  PaymentAnchorStatusSchema,
  RoutePlanSchema,
} from '@keeta-agent-stack/types';
import type { AppEnv } from '@keeta-agent-stack/config';
import {
  applyPolicyPack,
  CreatePolicyPackSchema,
  defaultPolicyConfigFromEnv,
  PolicyEngine,
  UpdatePolicyPackSchema,
  type PolicyConfig,
  type PolicyPack,
  resolvePolicyPackSelection as resolveStoredPolicyPackSelection,
} from '@keeta-agent-stack/policy';
import { intentRepo, routeRepo, auditRepo, policyRepo, settingsRepo, strategyRepo, walletRepo } from '@keeta-agent-stack/storage';
import { requireAdminAccess, requireOperatorAccess } from '../lib/auth.js';

const policyConfigOverrideSchema = z.object({
  maxOrderSize: z.number().finite().positive(),
  maxSlippageBps: z.number().finite().nonnegative(),
  venueAllowlist: z.array(z.string()),
  assetAllowlist: z.array(z.string()),
  liveModeEnabled: z.boolean(),
  keetaPolicyEnabled: z.boolean(),
  identityPolicyEnabled: z.boolean(),
  anchorBondVerificationRequired: z.boolean(),
  maxExposurePerAsset: z.number().finite().positive(),
  maxExposurePerWallet: z.number().finite().positive(),
  maxExposurePerVenue: z.number().finite().positive(),
  maxNotionalPerStrategy: z.number().finite().positive(),
  maxDailyTrades: z.number().finite().positive(),
  maxUnsettledExecutions: z.number().finite().positive(),
  maxDrawdownBps: z.number().finite().positive(),
}).partial();

const policyKeetaHintsSchema = z.object({
  network: z.string(),
  accountHeadBlockHeight: z.string().nullable().optional(),
  ledgerBlockCount: z.number().finite().optional(),
  measuredAt: z.string().optional(),
  identity: z.object({
    certificateFingerprintPresent: z.boolean().optional(),
  }).optional(),
});

const policyIdentityHintsSchema = z.object({
  strategyId: z.string().optional(),
  agentId: z.string().optional(),
  clientId: z.string().optional(),
  hasAttestation: z.boolean(),
  certificateFingerprint: z.string().optional(),
});

const policyPortfolioStatsSchema = z.object({
  dailyTradeCount: z.number().finite().nonnegative(),
  unsettledExecutions: z.number().finite().nonnegative(),
  openExposureByAsset: z.record(z.number().finite()).optional(),
  openExposureByVenue: z.record(z.number().finite()).optional(),
  walletExposure: z.number().finite().nonnegative().optional(),
});

const policyAnchorBondHintSchema = z.object({
  paymentAnchorId: z.string(),
  adapterId: z.string(),
  anchorStatus: z.union([PaymentAnchorStatusSchema, z.literal('missing')]),
  bondStatus: z.union([AnchorBondStatusSchema, z.literal('missing')]),
  amountAtomic: z.string().optional(),
  assetId: z.string().optional(),
  delayDays: z.union([z.literal(30), z.literal(90)]).optional(),
  lockTxHash: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  verificationSource: z.enum(['database', 'keeta', 'strict-missing']).optional(),
});

const evaluateBodySchema = z.object({
  intentId: z.string().uuid().optional(),
  intent: ExecutionIntentSchema.optional(),
  routePlan: RoutePlanSchema.optional(),
  reason: z.string().min(1),
  policyPackId: z.string().uuid().optional(),
  configOverrides: policyConfigOverrideSchema.optional(),
  contextOverrides: z.object({
    keetaHints: policyKeetaHintsSchema.optional(),
    identityHints: policyIdentityHintsSchema.optional(),
    portfolioStats: policyPortfolioStatsSchema.optional(),
    anchorBonds: z.record(policyAnchorBondHintSchema).optional(),
    customRuleConfig: z.record(z.unknown()).optional(),
  }).optional(),
}).superRefine((value, ctx) => {
  if (!value.intentId && !value.intent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['intentId'],
      message: 'Provide either intentId or intent',
    });
  }
});

function defaultPolicyConfig(env: AppEnv): PolicyConfig {
  return defaultPolicyConfigFromEnv(env);
}

/**
 * Produce a compact audit snapshot of a policy config. Arrays are replaced by their lengths
 * so the audit payload never leaks full venue / asset allowlists or other operational secrets
 * to downstream audit sinks.
 */
function redactedEffectiveConfig(config: PolicyConfig): Record<string, unknown> {
  return {
    maxOrderSize: config.maxOrderSize,
    maxSlippageBps: config.maxSlippageBps,
    venueAllowlistCount: config.venueAllowlist?.length ?? 0,
    assetAllowlistCount: config.assetAllowlist?.length ?? 0,
    liveModeEnabled: config.liveModeEnabled,
    keetaPolicyEnabled: config.keetaPolicyEnabled,
    identityPolicyEnabled: config.identityPolicyEnabled,
    anchorBondVerificationRequired: config.anchorBondVerificationRequired,
    maxExposurePerAsset: config.maxExposurePerAsset,
    maxExposurePerWallet: config.maxExposurePerWallet,
    maxExposurePerVenue: config.maxExposurePerVenue,
    maxNotionalPerStrategy: config.maxNotionalPerStrategy,
    maxDailyTrades: config.maxDailyTrades,
    maxUnsettledExecutions: config.maxUnsettledExecutions,
    maxDrawdownBps: config.maxDrawdownBps,
  };
}

type AppliedPolicyPackResponse = {
  id: string;
  name: string;
  source: 'request' | 'intent' | 'intent_metadata' | 'wallet_default' | 'strategy_config' | 'global_default';
};

type ResolvedPolicyPackSelection =
  | { policyPack: null }
  | { policyPack: PolicyPack; source: AppliedPolicyPackResponse['source'] }
  | {
      error: {
        code: 'NOT_FOUND';
        message: string;
      };
}

function strategyConfigPolicyPackId(config: unknown): string | undefined {
  if (!config || typeof config !== 'object') {
    return undefined;
  }
  const value = (config as Record<string, unknown>).policyPackId;
  return typeof value === 'string' ? value : undefined;
}

function walletDefaultPolicyPackId(settings: unknown): string | undefined {
  if (!settings || typeof settings !== 'object') {
    return undefined;
  }
  const value = (settings as Record<string, unknown>).defaultPolicyPackId;
  return typeof value === 'string' ? value : undefined;
}

function serializePolicyPack(
  row: Awaited<ReturnType<typeof policyRepo.getPolicyPackById>>
): PolicyPack | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    rules: row.rules ?? [],
    compositions: row.compositions ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolvePolicyPackSelection(
  db: Parameters<typeof policyRepo.getPolicyPackById>[0],
  intent: z.infer<typeof ExecutionIntentSchema>,
  env: AppEnv,
  explicitPolicyPackId?: string
): Promise<ResolvedPolicyPackSelection> {
  const wallet = await walletRepo.getWallet(db, intent.walletId);
  const strategy = intent.strategyId ? await strategyRepo.getStrategyById(db, intent.strategyId) : null;
  const globalDefaultPolicyPackId = (await settingsRepo.getDefaultPolicyPackId(db)) ?? env.DEFAULT_POLICY_PACK_ID ?? null;
  const resolved = await resolveStoredPolicyPackSelection({
    intent,
    explicitPolicyPackId,
    walletDefaultPolicyPackId: walletDefaultPolicyPackId(wallet?.settings),
    strategyPolicyPackId: strategyConfigPolicyPackId(strategy?.config),
    globalDefaultPolicyPackId,
    loadPolicyPack: async (id) => serializePolicyPack(await policyRepo.getPolicyPackById(db, id)),
  });
  if ('error' in resolved) {
    return {
      error: {
        code: 'NOT_FOUND',
        message: resolved.error.message,
      },
    };
  }
  if (!resolved.policyPack) {
    return { policyPack: null };
  }
  return {
    policyPack: resolved.policyPack,
    source: resolved.source,
  };
}

export const policyAdminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/policy/rules', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const engine = new PolicyEngine();
    return { rules: engine.listRuleMetadata() };
  });

  app.get('/policy/decisions', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const query = req.query as Record<string, unknown> | undefined;
    const limitRaw = query?.limit;
    const limit =
      typeof limitRaw === 'string'
        ? Number.parseInt(limitRaw, 10)
        : typeof limitRaw === 'number'
          ? limitRaw
          : 200;
    const safeLimit = Number.isFinite(limit) ? Math.min(1000, Math.max(1, limit)) : 200;
    const rows = await policyRepo.listRecentPolicyDecisions(app.db, safeLimit);
    return rows.map((r) => {
      const payload = r.payload ?? {};
      const readString = (key: string): string | null => {
        const value = (payload as Record<string, unknown>)[key];
        return typeof value === 'string' ? value : null;
      };
      return {
        id: r.id,
        intentId: r.intentId,
        outcome: readString('outcome') ?? readString('decision') ?? 'unknown',
        ruleId: readString('ruleId'),
        ruleName: readString('ruleName'),
        reason: readString('reason'),
        policyPackId: readString('policyPackId'),
        contributions: Array.isArray(r.ruleContributions) ? r.ruleContributions : [],
        createdAt: r.createdAt,
      };
    });
  });

  app.post('/policy/evaluate', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply, { allowAdminBypassToken: true }))) {
      return;
    }
    const parsed = evaluateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const { intentId, reason, configOverrides, contextOverrides, routePlan: routePlanOverride, policyPackId } = parsed.data;
    let intent = parsed.data.intent;
    let routePlan = routePlanOverride;
    if (!intent && intentId) {
      const row = await intentRepo.getIntentById(app.db, intentId);
      if (!row) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Intent not found' } });
      }
      intent = ExecutionIntentSchema.parse(row.payload);
    }
    if (!intent) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Intent payload required' } });
    }
    if (!routePlan && intentId) {
      const routeRow = await routeRepo.getRoutePlanForIntent(app.db, intentId);
      routePlan = routeRow ? RoutePlanSchema.parse(routeRow.payload) : undefined;
    }
    const resolvedPolicyPack = await resolvePolicyPackSelection(app.db, intent, app.env, policyPackId);
    if ('error' in resolvedPolicyPack) {
      return reply.status(404).send({ error: resolvedPolicyPack.error });
    }

    const engine = new PolicyEngine();
    let policyPackWarnings: string[] | undefined;
    let mergedCustomRuleConfig = { ...(contextOverrides?.customRuleConfig ?? {}) };
    if (resolvedPolicyPack.policyPack) {
      const applied = applyPolicyPack(engine, resolvedPolicyPack.policyPack);
      mergedCustomRuleConfig = {
        ...applied.customRuleConfig,
        ...mergedCustomRuleConfig,
      };
      if (applied.warnings.length > 0) {
        policyPackWarnings = applied.warnings;
      }
    }
    const effectiveConfig: PolicyConfig = {
      ...defaultPolicyConfig(app.env),
      ...configOverrides,
    };
    const baseDecision = engine.evaluate({
      intent,
      routePlan,
      config: effectiveConfig,
      keetaHints: contextOverrides?.keetaHints,
      identityHints: contextOverrides?.identityHints,
      portfolioStats: contextOverrides?.portfolioStats,
      anchorBonds: contextOverrides?.anchorBonds,
      customRuleConfig: mergedCustomRuleConfig,
    });
    const decision = resolvedPolicyPack.policyPack
      ? {
          ...baseDecision,
          effectivePolicyPackId: resolvedPolicyPack.policyPack.id,
          effectivePolicyPackName: resolvedPolicyPack.policyPack.name,
          effectivePolicyPackSource: resolvedPolicyPack.source,
          policyPack: {
            id: resolvedPolicyPack.policyPack.id,
            name: resolvedPolicyPack.policyPack.name,
            source: resolvedPolicyPack.source,
          },
          ...(policyPackWarnings ? { policyPackWarnings } : {}),
        }
      : baseDecision;
    // Inline preview payloads are allowed even when no intent row exists yet, so
    // only persist an audit event when the intent is actually present in storage.
    const canPersistAuditEvent = intentId
      ? true
      : Boolean(await intentRepo.getIntentById(app.db, intent.id));
    if (canPersistAuditEvent) {
      await auditRepo.insertAuditEvent(app.db, {
        intentId: intent.id,
        eventType: 'policy.admin_evaluate',
        payload: {
          reason,
          decision,
          effectiveConfig: redactedEffectiveConfig(effectiveConfig),
          source: 'api',
          ...(resolvedPolicyPack.policyPack
            ? {
                effectivePolicyPackId: resolvedPolicyPack.policyPack.id,
                effectivePolicyPackName: resolvedPolicyPack.policyPack.name,
                effectivePolicyPackSource: resolvedPolicyPack.source,
              }
            : {}),
          ...(resolvedPolicyPack.policyPack
            ? {
                policyPack: {
                  id: resolvedPolicyPack.policyPack.id,
                  name: resolvedPolicyPack.policyPack.name,
                  source: resolvedPolicyPack.source,
                },
              }
            : {}),
          ...(policyPackWarnings ? { policyPackWarnings } : {}),
        },
      });
    }
    return {
      decision,
      rules: engine.listRuleMetadata(),
      effectiveConfig,
      policyPack: resolvedPolicyPack.policyPack
        ? {
            id: resolvedPolicyPack.policyPack.id,
            name: resolvedPolicyPack.policyPack.name,
            source: resolvedPolicyPack.source,
          }
        : null,
      ...(policyPackWarnings ? { policyPackWarnings } : {}),
    };
  });

  app.get('/policy/packs', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const listed = await policyRepo.listPolicyPacks(app.db);
    return listed.map((row) => serializePolicyPack(row)!);
  });

  app.post('/policy/packs', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply, { allowAdminBypassToken: true }))) {
      return;
    }
    const parsed = CreatePolicyPackSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const created = await policyRepo.createPolicyPack(app.db, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      rules: parsed.data.rules,
      compositions: parsed.data.compositions,
    });
    return reply.status(201).send(serializePolicyPack(created)!);
  });

  app.patch('/policy/packs/:id', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply, { allowAdminBypassToken: true }))) {
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = UpdatePolicyPackSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const existing = await policyRepo.getPolicyPackById(app.db, id);
    if (!existing) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Policy pack not found' } });
    }
    const updated = await policyRepo.updatePolicyPack(app.db, id, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description ?? null } : {}),
      ...(parsed.data.rules !== undefined ? { rules: parsed.data.rules } : {}),
      ...(parsed.data.compositions !== undefined ? { compositions: parsed.data.compositions } : {}),
    });
    return serializePolicyPack(updated) ?? reply.status(500).send({ error: { code: 'UPDATE_FAILED' } });
  });

  app.delete('/policy/packs/:id', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply, { allowAdminBypassToken: true }))) {
      return;
    }
    const { id } = req.params as { id: string };
    const deleted = await policyRepo.deletePolicyPack(app.db, id);
    if (!deleted) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Policy pack not found' } });
    }
    return reply.status(204).send();
  });
};
