import { describe, expect, it } from 'vitest';
import { ANONYMOUS_VIEWER, type Viewer } from '../lib/permissions';
import { NAV_ITEMS, navForViewer } from '../lib/nav';

const admin: Viewer = {
  role: 'admin',
  scopes: [
    'ops:read',
    'ops:write',
    'policy:read',
    'policy:write',
    'kill_switch:read',
    'kill_switch:write',
    'webhooks:read',
    'webhooks:write',
    'rails:read',
  ],
};

const operator: Viewer = {
  role: 'operator',
  scopes: ['ops:read', 'policy:read', 'kill_switch:read', 'webhooks:read', 'rails:read'],
};

const tenant: Viewer = {
  role: 'tenant',
  tenantId: 'tenant_a',
  scopes: ['tenant:read', 'webhooks:read', 'rails:read'],
};

const exec: Viewer = {
  role: 'exec',
  scopes: ['exec:read', 'rails:read'],
};

describe('navForViewer: admin/operator', () => {
  it('admin sees the Command Center link', () => {
    const nav = navForViewer(admin);
    expect(nav.some((item) => item.href === '/dashboard')).toBe(true);
    expect(nav.some((item) => item.href === '/command-center')).toBe(true);
    expect(nav.some((item) => item.href === '/agents')).toBe(true);
    expect(nav.some((item) => item.href === '/policy')).toBe(true);
    expect(nav.some((item) => item.href === '/simulate')).toBe(true);
    expect(nav.some((item) => item.href === '/backtest')).toBe(true);
    expect(nav.some((item) => item.href === '/cost')).toBe(true);
  });

  it('operator sees cockpit surfaces and live feed', () => {
    const nav = navForViewer(operator);
    expect(nav.some((item) => item.href === '/dashboard')).toBe(true);
    expect(nav.some((item) => item.href === '/command-center')).toBe(true);
    expect(nav.some((item) => item.href === '/agents')).toBe(true);
    expect(nav.some((item) => item.href === '/live')).toBe(true);
    expect(nav.some((item) => item.href === '/simulate')).toBe(true);
  });

  it('operator without scopes loses links gated by capability', () => {
    const noScope: Viewer = { role: 'operator', scopes: [] };
    const nav = navForViewer(noScope);
    expect(nav.some((item) => item.href === '/dashboard')).toBe(false);
    expect(nav.some((item) => item.href === '/command-center')).toBe(false);
    expect(nav.some((item) => item.href === '/policy')).toBe(false);
  });
});

describe('navForViewer: tenant', () => {
  it('tenant does not see operator ops surfaces', () => {
    const nav = navForViewer(tenant);
    const hrefs = nav.map((item) => item.href);
    expect(hrefs).not.toContain('/dashboard');
    expect(hrefs).not.toContain('/agents');
    expect(hrefs).not.toContain('/command-center');
    expect(hrefs).not.toContain('/live');
    expect(hrefs).not.toContain('/policy');
    expect(hrefs).not.toContain('/simulate');
    expect(hrefs).not.toContain('/backtest');
    expect(hrefs).not.toContain('/cost');
    expect(hrefs).not.toContain('/anchors-health');
    expect(hrefs).not.toContain('/webhooks');
  });

  it('tenant sees tenant home and rail catalog (read-only)', () => {
    const nav = navForViewer(tenant);
    const hrefs = nav.map((item) => item.href);
    expect(hrefs).toContain('/home');
    expect(hrefs).toContain('/rails');
  });
});

describe('navForViewer: exec', () => {
  it('exec sees overview and rail catalog', () => {
    const nav = navForViewer(exec);
    const hrefs = nav.map((item) => item.href);
    expect(hrefs).toContain('/overview');
    expect(hrefs).toContain('/rails');
  });

  it('exec does not see mutation surfaces', () => {
    const nav = navForViewer(exec);
    const hrefs = nav.map((item) => item.href);
    expect(hrefs).not.toContain('/dashboard');
    expect(hrefs).not.toContain('/agents');
    expect(hrefs).not.toContain('/command-center');
    expect(hrefs).not.toContain('/live');
    expect(hrefs).not.toContain('/policy');
    expect(hrefs).not.toContain('/simulate');
    expect(hrefs).not.toContain('/backtest');
    expect(hrefs).not.toContain('/webhooks');
    expect(hrefs).not.toContain('/cost');
  });
});

describe('navForViewer: anonymous', () => {
  it('anonymous viewers see no nav links', () => {
    const nav = navForViewer(ANONYMOUS_VIEWER);
    expect(nav).toHaveLength(0);
  });
});

describe('NAV_ITEMS integrity', () => {
  it('every item declares at least one role', () => {
    for (const item of NAV_ITEMS) {
      expect(item.roles.length).toBeGreaterThan(0);
    }
  });

  it('anonymous never appears in any nav item role list', () => {
    for (const item of NAV_ITEMS) {
      expect(item.roles).not.toContain('anonymous');
    }
  });
});

describe('navForViewer: DASHBOARD_V2_ENABLED=false', () => {
  it('hides every V2-tagged surface for admins', () => {
    const nav = navForViewer(admin, { v2Enabled: false });
    const hrefs = nav.map((item) => item.href);
    for (const v2Path of [
      '/dashboard',
      '/command-center',
      '/live',
      '/agents',
      '/policy',
      '/simulate',
      '/backtest',
      '/anchors-health',
      '/webhooks',
      '/cost',
      '/overview',
      '/home',
      '/rails',
    ]) {
      expect(hrefs).not.toContain(v2Path);
    }
  });

  it('preserves legacy surfaces for admins', () => {
    const nav = navForViewer(admin, { v2Enabled: false });
    const hrefs = nav.map((item) => item.href);
    expect(hrefs).toContain('/intents');
    expect(hrefs).toContain('/executions');
    expect(hrefs).toContain('/wallets');
    expect(hrefs).toContain('/adapters');
    expect(hrefs).toContain('/simulations');
    expect(hrefs).toContain('/templates');
    expect(hrefs).toContain('/anchors');
  });

  it('returns empty nav for exec when V2 is off', () => {
    const nav = navForViewer(exec, { v2Enabled: false });
    expect(nav).toHaveLength(0);
  });

  it('tenant only keeps non-v2 links when V2 is off', () => {
    const nav = navForViewer(tenant, { v2Enabled: false });
    const hrefs = nav.map((item) => item.href);
    expect(hrefs).not.toContain('/home');
    expect(hrefs).not.toContain('/rails');
    expect(hrefs).toContain('/wallets');
  });

  it('defaults to v2Enabled=true when options is omitted', () => {
    expect(navForViewer(admin)).toEqual(navForViewer(admin, { v2Enabled: true }));
  });
});
