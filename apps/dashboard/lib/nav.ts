import type { Capability, Role, Viewer } from './permissions';

export interface NavItem {
  href: string;
  label: string;
  /** Roles that may see this link. */
  roles: readonly Role[];
  /** Optional capability gate on top of the role gate. */
  capability?: Capability;
  /** Optional grouping label. */
  group?: 'ops' | 'platform' | 'tenant' | 'exec' | 'reference';
  /**
   * Dashboard V2 surfaces are hidden when `DASHBOARD_V2_ENABLED=false`.
   * Legacy surfaces (intents/executions/wallets/...) must not be tagged so
   * operators retain their fallback even when V2 is disabled.
   */
  v2?: boolean;
}

/**
 * URL paths that `requireV2Enabled()` must 404 when the flag is off. Any new
 * V2-only route should be added here so the behavior remains consistent
 * across nav (hidden) and page-level guards (404).
 */
export const V2_ROUTE_PATHS: readonly string[] = [
  '/dashboard',
  '/command-center',
  '/live',
  '/agents',
  '/policy',
  '/policy/builder',
  '/simulate',
  '/backtest',
  '/anchors-health',
  '/webhooks',
  '/cost',
  '/overview',
  '/home',
  '/rails',
];

export const NAV_ITEMS: readonly NavItem[] = [
  // Operator / admin — Ops
  {
    href: '/dashboard',
    label: 'Dashboard',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/command-center',
    label: 'Command Center',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/live',
    label: 'Live Execution',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/policy',
    label: 'Policy Insights',
    roles: ['admin', 'operator'],
    capability: 'policy:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/agents',
    label: 'Agent Studio',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/simulate',
    label: 'Simulation Lab',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/backtest',
    label: 'Backtesting',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/anchors-health',
    label: 'Anchor & Bond Health',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/anchors',
    label: 'Anchor list',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'platform',
  },
  {
    href: '/webhooks',
    label: 'Webhook Deliveries',
    roles: ['admin', 'operator'],
    capability: 'webhooks:read',
    group: 'ops',
    v2: true,
  },
  {
    href: '/cost',
    label: 'Cost & Fees',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'ops',
    v2: true,
  },
  // Operator — Platform
  {
    href: '/intents',
    label: 'Intents',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'platform',
  },
  {
    href: '/executions',
    label: 'Executions',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'platform',
  },
  {
    href: '/simulations',
    label: 'Simulations',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'platform',
  },
  {
    href: '/adapters',
    label: 'Adapters',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'platform',
  },
  {
    href: '/templates',
    label: 'Strategy Templates',
    roles: ['admin', 'operator'],
    capability: 'ops:read',
    group: 'platform',
  },
  {
    href: '/rails',
    label: 'Rail Catalog',
    roles: ['admin', 'operator', 'tenant', 'exec'],
    capability: 'rails:read',
    group: 'reference',
    v2: true,
  },

  // Exec
  {
    href: '/overview',
    label: 'Overview',
    roles: ['exec'],
    capability: 'exec:read',
    group: 'exec',
    v2: true,
  },

  // Tenant
  {
    href: '/home',
    label: 'Home',
    roles: ['tenant'],
    capability: 'tenant:read',
    group: 'tenant',
    v2: true,
  },
  {
    href: '/wallets',
    label: 'My Wallets',
    roles: ['tenant', 'admin', 'operator'],
    group: 'tenant',
  },
  {
    href: '/my-intents',
    label: 'My Intents',
    roles: ['tenant'],
    capability: 'tenant:read',
    group: 'tenant',
  },
  {
    href: '/my-webhooks',
    label: 'My Webhooks',
    roles: ['tenant'],
    capability: 'webhooks:read',
    group: 'tenant',
  },
];

export interface NavForViewerOptions {
  v2Enabled?: boolean;
}

export function navForViewer(
  viewer: Viewer,
  options: NavForViewerOptions = { v2Enabled: true }
): readonly NavItem[] {
  const v2Enabled = options.v2Enabled ?? true;
  return NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(viewer.role)) return false;
    if (item.capability && !viewer.scopes.includes(item.capability)) return false;
    if (item.v2 && !v2Enabled) return false;
    return true;
  });
}

export function isV2Route(pathname: string): boolean {
  return V2_ROUTE_PATHS.includes(pathname);
}
