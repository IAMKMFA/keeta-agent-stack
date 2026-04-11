import { z } from 'zod';
import { AssetIdSchema } from './common.js';

export const AnchorWithdrawalDelayDaysSchema = z.union([z.literal(30), z.literal(90)]);

export const PaymentAnchorStatusSchema = z.enum([
  'draft',
  'commercial_defined',
  'bond_required',
  'bond_pending_lock',
  'active',
  'withdrawal_requested',
  'released',
  'suspended',
]);

export const AnchorBondStatusSchema = z.enum([
  'pending_lock',
  'active',
  'withdrawal_requested',
  'released',
  'failed_verification',
]);

export const AnchorCommercialTermsSchema = z.object({
  setupFeeNote: z.string().optional(),
  volumeFeeBps: z.number().nonnegative().optional(),
});

export const AnchorBondRecordSchema = z.object({
  id: z.string().uuid(),
  paymentAnchorId: z.string().uuid(),
  amountAtomic: z.string().min(1),
  assetId: AssetIdSchema.default('KTA'),
  delayDays: AnchorWithdrawalDelayDaysSchema,
  status: AnchorBondStatusSchema,
  lockTxHash: z.string().optional(),
  lockAccount: z.string().optional(),
  withdrawalRequestedAt: z.string().datetime().optional(),
  activatedAt: z.string().datetime().optional(),
  releasedAt: z.string().datetime().optional(),
  verified: z.boolean().optional(),
  verificationSource: z.enum(['database', 'keeta']).optional(),
  verificationDetails: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PaymentAnchorSchema = z.object({
  id: z.string().uuid(),
  adapterId: z.string().min(1),
  label: z.string().min(1),
  status: PaymentAnchorStatusSchema,
  corridorKey: z.string().optional(),
  operatorRef: z.string().optional(),
  publicLabel: z.boolean().default(true),
  corridorConfig: z.record(z.unknown()).default({}),
  supportedAssets: z.array(AssetIdSchema).default([]),
  commercialTerms: AnchorCommercialTermsSchema.default({}),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PaymentAnchorWithBondSchema = PaymentAnchorSchema.extend({
  currentBond: AnchorBondRecordSchema.optional(),
});

export const AnchorEventSchema = z.object({
  id: z.string().uuid(),
  paymentAnchorId: z.string().uuid(),
  anchorBondId: z.string().uuid().optional(),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export const PaymentAnchorReadinessSeveritySchema = z.enum(['warning', 'blocking']);

export const PaymentAnchorReadinessIssueSchema = z.object({
  code: z.enum([
    'commercial_terms_missing',
    'volume_fee_missing',
    'bond_missing',
    'bond_inactive',
    'bond_unverified',
    'anchor_not_active',
  ]),
  severity: PaymentAnchorReadinessSeveritySchema,
  message: z.string().min(1),
});

export const PaymentAnchorReadinessSchema = z.object({
  status: z.enum(['ready', 'needs_attention', 'blocked']),
  canActivate: z.boolean(),
  canServeLiveTraffic: z.boolean(),
  nextRecommendedStatus: PaymentAnchorStatusSchema.optional(),
  issues: z.array(PaymentAnchorReadinessIssueSchema).default([]),
});

export const PaymentAnchorOnboardingStatusSchema = z.enum(['advance', 'blocked', 'stable']);

export const PaymentAnchorOnboardingSchema = z.object({
  status: PaymentAnchorOnboardingStatusSchema,
  currentStatus: PaymentAnchorStatusSchema,
  nextStatus: PaymentAnchorStatusSchema.optional(),
  reason: z.string().min(1),
});

export const PaymentAnchorOperatorMetricsSchema = z.object({
  successRate: z.number().min(0).max(100).optional(),
  p50LatencyMs: z.number().min(0).optional(),
  p95LatencyMs: z.number().min(0).optional(),
  unsettledVolume: z.number().min(0).optional(),
  bondAgeDays: z.number().min(0).optional(),
  bondVerified: z.boolean().optional(),
  sampledAt: z.string().datetime().optional(),
});

export const PaymentAnchorSummarySchema = PaymentAnchorWithBondSchema.extend({
  readiness: PaymentAnchorReadinessSchema,
  onboarding: PaymentAnchorOnboardingSchema,
  operatorMetrics: PaymentAnchorOperatorMetricsSchema.optional(),
});

export const PaymentAnchorDetailSchema = PaymentAnchorSummarySchema.extend({
  events: z.array(AnchorEventSchema).default([]),
});

export type AnchorWithdrawalDelayDays = z.infer<typeof AnchorWithdrawalDelayDaysSchema>;
export type PaymentAnchorStatus = z.infer<typeof PaymentAnchorStatusSchema>;
export type AnchorBondStatus = z.infer<typeof AnchorBondStatusSchema>;
export type AnchorCommercialTerms = z.infer<typeof AnchorCommercialTermsSchema>;
export type AnchorBondRecord = z.infer<typeof AnchorBondRecordSchema>;
export type PaymentAnchor = z.infer<typeof PaymentAnchorSchema>;
export type PaymentAnchorWithBond = z.infer<typeof PaymentAnchorWithBondSchema>;
export type AnchorEvent = z.infer<typeof AnchorEventSchema>;
export type PaymentAnchorReadinessSeverity = z.infer<typeof PaymentAnchorReadinessSeveritySchema>;
export type PaymentAnchorReadinessIssue = z.infer<typeof PaymentAnchorReadinessIssueSchema>;
export type PaymentAnchorReadiness = z.infer<typeof PaymentAnchorReadinessSchema>;
export type PaymentAnchorOnboardingStatus = z.infer<typeof PaymentAnchorOnboardingStatusSchema>;
export type PaymentAnchorOnboarding = z.infer<typeof PaymentAnchorOnboardingSchema>;
export type PaymentAnchorOperatorMetrics = z.infer<typeof PaymentAnchorOperatorMetricsSchema>;
export type PaymentAnchorSummary = z.infer<typeof PaymentAnchorSummarySchema>;
export type PaymentAnchorDetail = z.infer<typeof PaymentAnchorDetailSchema>;

const allowedNextAnchorStatus: Record<PaymentAnchorStatus, Set<PaymentAnchorStatus>> = {
  draft: new Set(['commercial_defined', 'bond_required', 'suspended']),
  commercial_defined: new Set(['bond_required', 'bond_pending_lock', 'suspended']),
  bond_required: new Set(['bond_pending_lock', 'suspended']),
  bond_pending_lock: new Set(['active', 'bond_required', 'suspended']),
  active: new Set(['withdrawal_requested', 'suspended']),
  withdrawal_requested: new Set(['released', 'active', 'suspended']),
  released: new Set(['bond_required', 'bond_pending_lock', 'suspended']),
  suspended: new Set([
    'draft',
    'commercial_defined',
    'bond_required',
    'bond_pending_lock',
    'active',
    'withdrawal_requested',
    'released',
  ]),
};

export function canTransitionPaymentAnchorStatus(
  from: PaymentAnchorStatus,
  to: PaymentAnchorStatus
): boolean {
  return allowedNextAnchorStatus[from].has(to);
}

export function evaluatePaymentAnchorReadiness(
  anchor: Pick<PaymentAnchor, 'status' | 'commercialTerms'> & Pick<PaymentAnchorWithBond, 'currentBond'>,
  options: { strictBondVerification?: boolean } = {}
): PaymentAnchorReadiness {
  const issues: PaymentAnchorReadinessIssue[] = [];
  const strictBondVerification = options.strictBondVerification === true;
  const hasCommercialTerms =
    anchor.commercialTerms !== undefined &&
    (typeof anchor.commercialTerms.setupFeeNote === 'string' ||
      typeof anchor.commercialTerms.volumeFeeBps === 'number');
  const hasVolumeFee = typeof anchor.commercialTerms?.volumeFeeBps === 'number';
  const bond = anchor.currentBond;
  const bondActive = bond?.status === 'active';
  const bondVerified = bond?.verified === true;

  if (!hasCommercialTerms) {
    issues.push({
      code: 'commercial_terms_missing',
      severity: 'warning',
      message: 'Commercial terms have not been recorded yet.',
    });
  }

  if (!hasVolumeFee) {
    issues.push({
      code: 'volume_fee_missing',
      severity: anchor.status === 'draft' ? 'warning' : 'blocking',
      message: 'Volume fee bps must be configured before the anchor can go live.',
    });
  }

  if (!bond) {
    issues.push({
      code: 'bond_missing',
      severity: 'blocking',
      message: 'No KTA bond record is registered for this anchor.',
    });
  } else if (!bondActive) {
    issues.push({
      code: 'bond_inactive',
      severity: 'blocking',
      message: `The current bond is ${bond.status} and cannot serve live traffic.`,
    });
  }

  if (strictBondVerification && bond && !bondVerified) {
    issues.push({
      code: 'bond_unverified',
      severity: 'blocking',
      message: 'Strict bond verification is enabled and the current bond is not verified.',
    });
  } else if (bond && !bondVerified) {
    issues.push({
      code: 'bond_unverified',
      severity: 'warning',
      message: 'The current bond has not been verified yet.',
    });
  }

  if (anchor.status !== 'active') {
    issues.push({
      code: 'anchor_not_active',
      severity: 'blocking',
      message: `Anchor status is ${anchor.status}; only active anchors can serve live traffic.`,
    });
  }

  const canActivate =
    hasVolumeFee &&
    bond !== undefined &&
    bondActive &&
    (!strictBondVerification || bondVerified);
  const canServeLiveTraffic = anchor.status === 'active' && canActivate;
  const hasBlockingIssues = issues.some((issue) => issue.severity === 'blocking');

  let nextRecommendedStatus: PaymentAnchorStatus | undefined;
  if (!hasVolumeFee) {
    nextRecommendedStatus = 'commercial_defined';
  } else if (!bond || bond.status === 'released' || bond.status === 'failed_verification') {
    nextRecommendedStatus = 'bond_required';
  } else if (bond.status === 'pending_lock') {
    nextRecommendedStatus = 'bond_pending_lock';
  } else if (bond.status === 'withdrawal_requested') {
    nextRecommendedStatus = 'withdrawal_requested';
  } else if (canActivate && anchor.status !== 'active') {
    nextRecommendedStatus = 'active';
  }

  return {
    status: hasBlockingIssues ? 'blocked' : issues.length > 0 ? 'needs_attention' : 'ready',
    canActivate,
    canServeLiveTraffic,
    nextRecommendedStatus,
    issues,
  };
}

export function evaluatePaymentAnchorOnboarding(
  anchor: Pick<PaymentAnchor, 'status' | 'commercialTerms'> & Pick<PaymentAnchorWithBond, 'currentBond'>,
  options: { strictBondVerification?: boolean } = {}
): PaymentAnchorOnboarding {
  const readiness = evaluatePaymentAnchorReadiness(anchor, options);
  const bondStatus = anchor.currentBond?.status;
  const hasCommercialTerms =
    anchor.commercialTerms !== undefined &&
    (typeof anchor.commercialTerms.setupFeeNote === 'string' ||
      typeof anchor.commercialTerms.volumeFeeBps === 'number');
  const hasVolumeFee = typeof anchor.commercialTerms?.volumeFeeBps === 'number';

  switch (anchor.status) {
    case 'draft':
      if (hasCommercialTerms) {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'commercial_defined',
          reason: 'Commercial terms are present, so the anchor can move into commercial review.',
        };
      }
      return {
        status: 'blocked',
        currentStatus: anchor.status,
        reason: 'Add commercial terms before onboarding can progress.',
      };

    case 'commercial_defined':
      if (hasVolumeFee) {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'bond_required',
          reason: 'Volume fee bps are configured, so the anchor can request a KTA bond.',
        };
      }
      return {
        status: 'blocked',
        currentStatus: anchor.status,
        reason: 'Set the volume fee bps before requesting bond lock.',
      };

    case 'bond_required':
      if (!anchor.currentBond) {
        return {
          status: 'blocked',
          currentStatus: anchor.status,
          reason: 'Create a bond record to continue onboarding.',
        };
      }
      if (
        bondStatus === 'pending_lock' ||
        bondStatus === 'active' ||
        bondStatus === 'withdrawal_requested'
      ) {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'bond_pending_lock',
          reason: 'A bond record exists, so onboarding can move into bond settlement.',
        };
      }
      return {
        status: 'blocked',
        currentStatus: anchor.status,
        reason: `Bond status is ${bondStatus}; refresh or replace the bond before continuing.`,
      };

    case 'bond_pending_lock':
      if (bondStatus === 'active' && readiness.canActivate) {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'active',
          reason: 'The bond is active and verified enough for live activation.',
        };
      }
      if (!anchor.currentBond || bondStatus === 'released' || bondStatus === 'failed_verification') {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'bond_required',
          reason: 'The current bond is no longer usable, so onboarding returns to bond requirement.',
        };
      }
      return {
        status: 'blocked',
        currentStatus: anchor.status,
        reason: 'Waiting for the bond to become active and verified.',
      };

    case 'active':
      if (bondStatus === 'withdrawal_requested') {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'withdrawal_requested',
          reason: 'The bond has entered withdrawal delay, so the anchor should move into exit posture.',
        };
      }
      return {
        status: 'stable',
        currentStatus: anchor.status,
        reason: readiness.canServeLiveTraffic
          ? 'Anchor is active and eligible for live traffic.'
          : 'Anchor is active, but readiness issues still need operator attention.',
      };

    case 'withdrawal_requested':
      if (bondStatus === 'released') {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'released',
          reason: 'The bond has been released, so the anchor can complete exit.',
        };
      }
      if (bondStatus === 'active' && readiness.canActivate) {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'active',
          reason: 'The bond returned to active posture, so the anchor can resume service.',
        };
      }
      return {
        status: 'blocked',
        currentStatus: anchor.status,
        reason: 'Waiting for the withdrawal delay to complete or the bond to return active.',
      };

    case 'released':
      if (!hasCommercialTerms) {
        return {
          status: 'blocked',
          currentStatus: anchor.status,
          reason: 'Commercial terms are missing, so re-onboarding cannot begin yet.',
        };
      }
      if (!hasVolumeFee) {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'commercial_defined',
          reason: 'Commercial metadata exists but volume fee is incomplete, so resume commercial setup.',
        };
      }
      if (!anchor.currentBond || bondStatus === 'released' || bondStatus === 'failed_verification') {
        return {
          status: 'advance',
          currentStatus: anchor.status,
          nextStatus: 'bond_required',
          reason: 'Released anchors need a fresh bond before they can rejoin the network.',
        };
      }
      return {
        status: 'advance',
        currentStatus: anchor.status,
        nextStatus: 'bond_pending_lock',
        reason: 'A new bond exists, so the anchor can resume onboarding.',
      };

    case 'suspended':
      return {
        status: 'blocked',
        currentStatus: anchor.status,
        reason: 'Suspended anchors require operator review before onboarding can continue.',
      };
  }
}
