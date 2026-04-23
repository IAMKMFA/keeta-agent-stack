/**
 * Server-only feature flag utilities. Never expose these booleans through
 * `NEXT_PUBLIC_*` — if the client needs to know, pass the resolved boolean
 * as a prop from a server component.
 */
import { notFound } from 'next/navigation';

function readBool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (typeof raw !== 'string') return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

export function isDashboardV2Enabled(): boolean {
  return readBool('DASHBOARD_V2_ENABLED', true);
}

/**
 * 404s the current route when `DASHBOARD_V2_ENABLED=false`. Used by every
 * V2-only page so a disabled rollout hides both the nav link *and* the
 * underlying URL. Backend guards on the upstream API are independent of
 * this flag — it is strictly a UI rollout control, never a security
 * boundary.
 */
export function requireV2Enabled(): void {
  if (!isDashboardV2Enabled()) {
    notFound();
  }
}

export function devViewerRole(): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  const role = process.env.DASHBOARD_DEV_VIEWER_ROLE;
  if (!role) return null;
  const lowered = role.trim().toLowerCase();
  if (['admin', 'operator', 'tenant', 'exec'].includes(lowered)) return lowered;
  return null;
}
