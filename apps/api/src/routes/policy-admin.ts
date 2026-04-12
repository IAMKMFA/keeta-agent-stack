import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  AnchorBondStatusSchema,
  ExecutionIntentSchema,
  PaymentAnchorStatusSchema,
  RoutePlanSchema,
} from '@keeta-agent-sdk/types';
import type { AppEnv } from '@keeta-agent-sdk/config';
import {
  applyPolicyPack,
  CreatePolicyPackSchema,
  PolicyEngine,
  UpdatePolicyPackSchema,
  type PolicyConfig,
  type PolicyPack,
} from '@keeta-agent-sdk/policy';
import { intentRepo, routeRepo, auditRepo, policyRepo, strategyRepo } from '@keeta-agent-sdk/storage';
import { requireAdminAccess } from '../lib/auth.js';

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
  return {
    maxOrderSize: Number(process.env.POLICY_MAX_ORDER_SIZE ?? 1_000_000),
    maxSlippageBps: Number(process.env.POLICY_MAX_SLIPPAGE_BPS ?? 500),
    venueAllowlist: (process.env.POLICY_VENUE_ALLOWLIST ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    assetAllowlist: (process.env.POLICY_ASSET_ALLOWLIST ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    liveModeEnabled: process.env.LIVE_MODE_ENABLED === 'true' || process.env.LIVE_MODE_ENABLED === '1',
    keetaPolicyEnabled: env.KEETA_POLICY_ENABLED === true,
    identityPolicyEnabled: env.IDENTITY_POLICY_ENABLED === true,
    anchorBondVerificationRequired: env.ANCHOR_BOND_STRICT === true,
    maxExposurePerAsset: numEnv('POLICY_MAX_EXPOSURE_PER_ASSET'),
    maxExposurePerWallet: numEnv('POLICY_MAX_EXPOSURE_PER_WALLET'),
    maxExposurePerVenue: numEnv('POLICY_MAX_EXPOSURE_PER_VENUE'),
    maxNotionalPerStrategy: numEnv('POLICY_MAX_NOTIONAL_PER_STRATEGY'),
    maxDailyTrades: numEnv('POLICY_MAX_DAILY_TRADES', 50_000),
    maxUnsettledExecutions: numEnv('POLICY_MAX_UNSETTLED', 5000),
    maxDrawdownBps: numEnv('POLICY_MAX_DRAWDOWN_BPS'),
  };
}

function numEnv(key: string, defaultVal?: number): number | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultVal;
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultVal;
}

type AppliedPolicyPackResponse = {
  id: string;
  name: string;
  source: 'request' | 'intent_metadata' | 'strategy_config';
};

type ResolvedPolicyPackSelection =
  | { policyPack: null }
  | { policyPack: PolicyPack; source: AppliedPolicyPackResponse['source'] }
  | {
      error: {
        code: 'NOT_FOUND';
        message: string;
      };
    };

function metadataPolicyPackId(intent: z.infer<typeof ExecutionIntentSchema>): string | undefined {
  const value = intent.metadata?.policyPackId;
  return typeof value === 'string' ? value : undefined;
}

function strategyConfigPolicyPackId(config: unknown): string | undefined {
  if (!config || typeof config !== 'object') {
    return undefined;
  }
  const value = (config as Record<string, unknown>).policyPackId;
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
  explicitPolicyPackId?: string
): Promise<ResolvedPolicyPackSelection> {
  const directPolicyPackId = explicitPolicyPackId ?? metadataPolicyPackId(intent);
  if (directPolicyPackId) {
    const pack = serializePolicyPack(await policyRepo.getPolicyPackById(db, directPolicyPackId));
    if (!pack) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: `Policy pack not found: ${directPolicyPackId}`,
        },
      };
    }
    return {
      policyPack: pack,
      source: explicitPolicyPackId ? 'request' : 'intent_metadata',
    };
  }

  if (!intent.strategyId) {
    return { policyPack: null };
  }

  const strategy = await strategyRepo.getStrategyById(db, intent.strategyId);
  const strategyPolicyPackId = strategyConfigPolicyPackId(strategy?.config);
  if (!strategyPolicyPackId) {
    return { policyPack: null };
  }

  const pack = serializePolicyPack(await policyRepo.getPolicyPackById(db, strategyPolicyPackId));
  if (!pack) {
    return {
      error: {
        code: 'NOT_FOUND',
        message: `Policy pack not found: ${strategyPolicyPackId}`,
      },
    };
  }
  return {
    policyPack: pack,
    source: 'strategy_config',
  };
}

export const policyAdminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/policy/rules', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply, { allowAdminBypassToken: true }))) {
      return;
    }
    const engine = new PolicyEngine();
    return { rules: engine.listRuleMetadata() };
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
    const resolvedPolicyPack = await resolvePolicyPackSelection(app.db, intent, policyPackId);
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
    const decision = engine.evaluate({
      intent,
      routePlan,
      config: effectiveConfig,
      keetaHints: contextOverrides?.keetaHints,
      identityHints: contextOverrides?.identityHints,
      portfolioStats: contextOverrides?.portfolioStats,
      anchorBonds: contextOverrides?.anchorBonds,
      customRuleConfig: mergedCustomRuleConfig,
    });
    await auditRepo.insertAuditEvent(app.db, {
      intentId: intent.id,
      eventType: 'policy.admin_evaluate',
      payload: {
        reason,
        decision,
        effectiveConfig,
        source: 'api',
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
    if (!(await requireAdminAccess(app, req, reply, { allowAdminBypassToken: true }))) {
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
