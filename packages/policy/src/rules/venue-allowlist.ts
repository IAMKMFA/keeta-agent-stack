import type { PolicyRuleContribution } from '@keeta-agent-sdk/types';
import type { PolicyContext } from '../types.js';

export function ruleVenueAllowlist(ctx: PolicyContext): PolicyRuleContribution {
  const allow = ctx.config.venueAllowlist;
  if (allow.length === 0) {
    return { ruleId: 'venue_allowlist', passed: true, limits: { allowlist: allow } };
  }
  const venues = new Set(allow);
  const intentVenues = ctx.intent.venueAllowlist;
  if (intentVenues && intentVenues.length > 0) {
    const ok = intentVenues.every((v) => venues.has(v));
    return {
      ruleId: 'venue_allowlist',
      passed: ok,
      reason: ok ? undefined : 'Intent references venues outside allowlist',
      limits: { allowlist: allow },
    };
  }
  if (ctx.routePlan) {
    const ok = ctx.routePlan.steps.every((s) => venues.has(s.adapterId));
    return {
      ruleId: 'venue_allowlist',
      passed: ok,
      reason: ok ? undefined : 'Route uses adapter not on venue allowlist',
      limits: { allowlist: allow },
    };
  }
  return { ruleId: 'venue_allowlist', passed: true, limits: { allowlist: allow } };
}
