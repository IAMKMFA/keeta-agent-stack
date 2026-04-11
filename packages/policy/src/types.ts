import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type {
  AnchorBondStatus,
  AnchorWithdrawalDelayDays,
  ExecutionIntent,
  PaymentAnchorStatus,
  RoutePlan,
} from '@keeta-agent-sdk/types';
import type { ZodType } from 'zod';

export interface PolicyConfig {
  maxOrderSize: number;
  maxSlippageBps: number;
  venueAllowlist: string[];
  assetAllowlist: string[];
  liveModeEnabled: boolean;
  /**
   * When true, {@link ruleKeetaExtension} requires {@link PolicyContext.keetaHints}
   * (populated by worker/API preflight against Keeta).
   */
  keetaPolicyEnabled?: boolean;
  /**
   * When true, {@link ruleIdentityAttestation} requires identity metadata on the intent.
   */
  identityPolicyEnabled?: boolean;
  /** When true, live anchor routes require a verified active bond hint. */
  anchorBondVerificationRequired?: boolean;
  /** Optional portfolio / risk caps (0 or undefined disables a check). */
  maxExposurePerAsset?: number;
  maxExposurePerWallet?: number;
  maxExposurePerVenue?: number;
  maxNotionalPerStrategy?: number;
  maxDailyTrades?: number;
  maxUnsettledExecutions?: number;
  /** When set, requires equity history — currently returns not implemented. */
  maxDrawdownBps?: number;
}

/** Optional aggregates supplied by worker for portfolio rules. */
export interface PolicyPortfolioStats {
  dailyTradeCount: number;
  unsettledExecutions: number;
  openExposureByAsset?: Record<string, number>;
  openExposureByVenue?: Record<string, number>;
  walletExposure?: number;
}

/** Optional Keeta-derived hints for Keeta-aware policy rules (extension point). */
export interface PolicyKeetaHints {
  network: string;
  accountHeadBlockHeight?: string | null;
  ledgerBlockCount?: number;
  measuredAt?: string;
  /** Placeholder for future x.509 / account-bound certificate signals from Keeta SDK. */
  identity?: {
    certificateFingerprintPresent?: boolean;
  };
}

/** Agent / client identity context for autonomous execution policy (metadata-driven today). */
export interface PolicyIdentityHints {
  strategyId?: string;
  agentId?: string;
  clientId?: string;
  hasAttestation: boolean;
  certificateFingerprint?: string;
}

export interface PolicyAnchorBondHint {
  paymentAnchorId: string;
  adapterId: string;
  anchorStatus: PaymentAnchorStatus | 'missing';
  bondStatus: AnchorBondStatus | 'missing';
  amountAtomic?: string;
  assetId?: string;
  delayDays?: AnchorWithdrawalDelayDays;
  lockTxHash?: string | null;
  verified?: boolean;
  verificationSource?: 'database' | 'keeta' | 'strict-missing';
}

export interface PolicyContext {
  intent: ExecutionIntent;
  routePlan?: RoutePlan;
  config: PolicyConfig;
  /** Set by worker when `keetaPolicyEnabled` and preflight runs */
  keetaHints?: PolicyKeetaHints;
  /** Set by worker for anchor bond posture keyed by adapter id */
  anchorBonds?: Record<string, PolicyAnchorBondHint>;
  /** Set by worker for exposure / trade-count rules */
  portfolioStats?: PolicyPortfolioStats;
  /** Agent/strategy identity — set by worker from intent.metadata */
  identityHints?: PolicyIdentityHints;
  /** Optional bag for custom rule config keyed by rule id or configKey. */
  customRuleConfig?: Record<string, unknown>;
}

export interface PolicyEvaluationOverrides {
  keetaHints?: PolicyKeetaHints;
  anchorBonds?: Record<string, PolicyAnchorBondHint>;
  portfolioStats?: PolicyPortfolioStats;
  identityHints?: PolicyIdentityHints;
  customRuleConfig?: Record<string, unknown>;
}

export type PolicyRuleSource = 'default' | 'custom';
export type PolicyCompositionOperator = 'allOf' | 'anyOf' | 'not';
export type PolicyEntryKind = 'rule' | 'composition';

export interface PolicyRuleMetadata {
  ruleId: string;
  priority?: number;
  configKey?: string;
  description?: string;
  hasConfigSchema: boolean;
  source: PolicyRuleSource;
  enabled: boolean;
  kind: PolicyEntryKind;
  operator?: PolicyCompositionOperator;
  children?: string[];
}

export interface PolicyRuleDefinition<TConfig = unknown> {
  ruleId: string;
  priority?: number;
  configKey?: string;
  description?: string;
  configSchema?: ZodType<TConfig>;
  evaluate: (ctx: PolicyContext, config: TConfig | undefined) => PolicyRuleContribution;
}

export interface PolicyRuleCompositionDefinition {
  ruleId: string;
  priority?: number;
  description?: string;
  operator: PolicyCompositionOperator;
  children: string[];
}

export interface PolicyEngineOptions {
  includeDefaultRules?: boolean;
  rules?: PolicyRuleDefinition[];
  compositions?: PolicyRuleCompositionDefinition[];
  disabledRuleIds?: string[];
}
