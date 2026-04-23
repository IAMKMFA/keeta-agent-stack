import { describe, expect, it } from 'vitest';
import {
  ANONYMOUS_VIEWER,
  hasRole,
  hasScope,
  roleHome,
  type Viewer,
} from '../lib/permissions';

const operator: Viewer = {
  role: 'operator',
  displayName: 'Op',
  scopes: ['ops:read', 'ops:write', 'kill_switch:write'],
};

const tenant: Viewer = {
  role: 'tenant',
  displayName: 'Tenant A',
  tenantId: 'tenant_a',
  scopes: ['tenant:read', 'webhooks:read'],
};

const exec: Viewer = {
  role: 'exec',
  displayName: 'Exec',
  scopes: ['exec:read', 'rails:read'],
};

describe('permissions.hasRole', () => {
  it('matches exact role', () => {
    expect(hasRole(operator, ['admin', 'operator'])).toBe(true);
    expect(hasRole(tenant, ['admin', 'operator'])).toBe(false);
    expect(hasRole(exec, ['exec'])).toBe(true);
    expect(hasRole(ANONYMOUS_VIEWER, ['admin', 'operator'])).toBe(false);
  });
});

describe('permissions.hasScope', () => {
  it('returns true only when scope is present', () => {
    expect(hasScope(operator, 'kill_switch:write')).toBe(true);
    expect(hasScope(operator, 'policy:write')).toBe(false);
    expect(hasScope(tenant, 'tenant:read')).toBe(true);
    expect(hasScope(tenant, 'kill_switch:write')).toBe(false);
    expect(hasScope(exec, 'exec:read')).toBe(true);
    expect(hasScope(ANONYMOUS_VIEWER, 'ops:read')).toBe(false);
  });
});

describe('permissions.roleHome', () => {
  it('routes operators to command center', () => {
    expect(roleHome('admin')).toBe('/command-center');
    expect(roleHome('operator')).toBe('/command-center');
  });

  it('routes exec to overview', () => {
    expect(roleHome('exec')).toBe('/overview');
  });

  it('routes tenant to home', () => {
    expect(roleHome('tenant')).toBe('/home');
  });

  it('routes anonymous to login', () => {
    expect(roleHome('anonymous')).toBe('/login');
  });
});
