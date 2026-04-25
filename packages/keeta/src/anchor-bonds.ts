import type { AnchorBondStatus, AnchorWithdrawalDelayDays } from '@keeta-agent-stack/types';
import type { AppEnv } from '@keeta-agent-stack/config';

export interface AnchorBondVerificationInput {
  paymentAnchorId: string;
  adapterId: string;
  bondId?: string;
  status?: AnchorBondStatus;
  delayDays?: AnchorWithdrawalDelayDays;
  lockTxHash?: string | null;
  lockAccount?: string | null;
}

export interface AnchorBondInspectionResult {
  observedStatus: AnchorBondStatus;
  verified: boolean;
  source: 'database' | 'strict-missing' | 'keeta';
  checkedAt: string;
  details: Record<string, unknown>;
}

export interface AnchorBondVerificationResult {
  verified: boolean;
  source: 'database' | 'strict-missing' | 'keeta';
  details: Record<string, unknown>;
}

export interface AnchorBondVerifier {
  inspectBond(input: AnchorBondVerificationInput): Promise<AnchorBondInspectionResult>;
  verifyBond(input: AnchorBondVerificationInput): Promise<AnchorBondVerificationResult>;
}

class DefaultAnchorBondVerifier implements AnchorBondVerifier {
  constructor(private readonly strict: boolean) {}

  async inspectBond(input: AnchorBondVerificationInput): Promise<AnchorBondInspectionResult> {
    const checkedAt = new Date().toISOString();
    const observedStatus = input.status ?? 'pending_lock';
    if (!this.strict) {
      return {
        observedStatus,
        verified: observedStatus === 'active',
        source: 'database',
        checkedAt,
        details: {
          mode: 'development-trust-db',
          note: 'Database-backed bond verification; Keeta on-chain verifier not configured yet.',
          delayDays: input.delayDays,
          observedStatus,
          hasLockTxHash: Boolean(input.lockTxHash),
        },
      };
    }

    const hasLockRef = Boolean(input.lockTxHash || input.lockAccount);
    const observedStrictStatus =
      observedStatus === 'active' && !hasLockRef ? 'failed_verification' : observedStatus;
    return {
      observedStatus: observedStrictStatus,
      verified: observedStrictStatus === 'active' && hasLockRef,
      source: hasLockRef ? 'database' : 'strict-missing',
      checkedAt,
      details: {
        mode: 'strict',
        observedStatus: observedStrictStatus,
        hasLockRef,
        note: hasLockRef
          ? 'Strict mode accepted database bond record with lock reference.'
          : 'ANCHOR_BOND_STRICT is enabled but no lock reference was configured.',
      },
    };
  }

  async verifyBond(input: AnchorBondVerificationInput): Promise<AnchorBondVerificationResult> {
    const observation = await this.inspectBond(input);
    return {
      verified: observation.verified,
      source: observation.source,
      details: observation.details,
    };
  }
}

export function createAnchorBondVerifier(
  env: Pick<AppEnv, 'ANCHOR_BOND_STRICT'>
): AnchorBondVerifier {
  return new DefaultAnchorBondVerifier(env.ANCHOR_BOND_STRICT === true);
}
