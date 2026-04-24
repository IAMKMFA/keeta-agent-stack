/**
 * Pure rebalance math. Given a set of target weights and the current wallet
 * balances, compute at most one corrective leg per tick: the asset that has
 * drifted the most over the threshold, swapped against the base asset.
 *
 * Pure functions live here so they can be unit tested without the API.
 */
import type { AllocationTarget, RebalancerConfig } from './config.js';

export interface BalanceSnapshot {
  asset: string;
  amount: number;
}

export interface RebalanceLeg {
  baseAsset: string;
  quoteAsset: string;
  side: 'buy' | 'sell';
  size: string;
  driftBps: number;
  rationale: string;
}

export type RebalanceDecision =
  | { kind: 'noop'; reason: string }
  | { kind: 'leg'; leg: RebalanceLeg };

interface AllocationDelta {
  asset: string;
  currentWeight: number;
  targetWeight: number;
  driftBps: number;
  notionalDelta: number;
}

function sumNotional(balances: BalanceSnapshot[]): number {
  return balances.reduce((acc, balance) => acc + balance.amount, 0);
}

function findTarget(targets: AllocationTarget[], asset: string): number {
  const match = targets.find((target) => target.asset === asset);
  return match?.weight ?? 0;
}

export function computeAllocationDeltas(
  balances: BalanceSnapshot[],
  targets: AllocationTarget[]
): AllocationDelta[] {
  const total = sumNotional(balances);
  if (total <= 0) return [];

  return targets.map((target) => {
    const balance = balances.find((entry) => entry.asset === target.asset);
    const currentAmount = balance?.amount ?? 0;
    const currentWeight = currentAmount / total;
    const driftBps = Math.round((currentWeight - target.weight) * 10_000);
    const notionalDelta = (target.weight - currentWeight) * total;
    return {
      asset: target.asset,
      currentWeight,
      targetWeight: target.weight,
      driftBps,
      notionalDelta,
    };
  });
}

/**
 * Pick the single most-overweight asset and the single most-underweight
 * asset, then emit one leg that sells the overweight side for the
 * underweight side. One leg per tick keeps the loop legible — any residual
 * drift is fixed on the next tick.
 */
export function decideRebalance(
  balances: BalanceSnapshot[],
  cfg: RebalancerConfig
): RebalanceDecision {
  if (balances.length === 0) {
    return { kind: 'noop', reason: 'wallet has no balances yet' };
  }

  const total = sumNotional(balances);
  if (total <= 0) {
    return { kind: 'noop', reason: 'wallet total notional is zero' };
  }

  const targetCoverage = cfg.targets.every(
    (target) => findTarget(cfg.targets, target.asset) > 0
  );
  if (!targetCoverage) {
    return { kind: 'noop', reason: 'no positive target weights configured' };
  }

  const deltas = computeAllocationDeltas(balances, cfg.targets);
  const overweight = [...deltas].sort((a, b) => a.notionalDelta - b.notionalDelta)[0];
  const underweight = [...deltas].sort((a, b) => b.notionalDelta - a.notionalDelta)[0];

  if (!overweight || !underweight || overweight.asset === underweight.asset) {
    return { kind: 'noop', reason: 'no distinct over/underweight pair' };
  }

  const worstAbsDrift = Math.max(Math.abs(overweight.driftBps), Math.abs(underweight.driftBps));
  if (worstAbsDrift < cfg.driftThresholdBps) {
    return {
      kind: 'noop',
      reason: `worst drift ${worstAbsDrift} bps is within threshold ${cfg.driftThresholdBps} bps`,
    };
  }

  // Sell the overweight side for the underweight side. Size is the smaller of
  // (overweight surplus, underweight deficit, cfg.maxLegNotional).
  const surplus = Math.abs(overweight.notionalDelta);
  const deficit = Math.abs(underweight.notionalDelta);
  const size = Math.min(surplus, deficit, cfg.maxLegNotional);

  if (size <= 0) {
    return { kind: 'noop', reason: 'computed leg size is zero' };
  }

  const leg: RebalanceLeg = {
    baseAsset: overweight.asset,
    quoteAsset: underweight.asset,
    side: 'sell',
    size: size.toFixed(2),
    driftBps: overweight.driftBps,
    rationale: `${overweight.asset} ${(overweight.currentWeight * 100).toFixed(2)}% (target ${(overweight.targetWeight * 100).toFixed(2)}%) -> sell ${size.toFixed(2)} for ${underweight.asset} ${(underweight.currentWeight * 100).toFixed(2)}% (target ${(underweight.targetWeight * 100).toFixed(2)}%)`,
  };
  return { kind: 'leg', leg };
}
