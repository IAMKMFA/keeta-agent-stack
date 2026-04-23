import { describe, it, expect } from 'vitest';
import { MeResponseSchema, parseMeResponse } from '../lib/auth';

describe('MeResponseSchema', () => {
  it('accepts a valid admin payload with scopes', () => {
    const result = MeResponseSchema.safeParse({
      role: 'admin',
      displayName: 'Jane Admin',
      scopes: ['ops:read', 'ops:write', 'kill_switch:write'],
      authType: 'jwt',
    });
    expect(result.success).toBe(true);
  });

  it('accepts operator without tenantId', () => {
    const result = MeResponseSchema.safeParse({ role: 'operator', scopes: ['ops:read'] });
    expect(result.success).toBe(true);
  });

  it('accepts exec with no scopes', () => {
    const result = MeResponseSchema.safeParse({ role: 'exec' });
    expect(result.success).toBe(true);
  });

  it('rejects tenant without tenantId', () => {
    const result = MeResponseSchema.safeParse({ role: 'tenant', scopes: ['tenant:read'] });
    expect(result.success).toBe(false);
  });

  it('accepts tenant with tenantId', () => {
    const result = MeResponseSchema.safeParse({
      role: 'tenant',
      tenantId: 'tenant_abc',
      scopes: ['tenant:read'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects tenant with empty tenantId string', () => {
    const result = MeResponseSchema.safeParse({
      role: 'tenant',
      tenantId: '',
      scopes: ['tenant:read'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown role', () => {
    const result = MeResponseSchema.safeParse({ role: 'superuser', scopes: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing role', () => {
    const result = MeResponseSchema.safeParse({ displayName: 'Nobody' });
    expect(result.success).toBe(false);
  });

  it('rejects non-object body', () => {
    expect(MeResponseSchema.safeParse('admin').success).toBe(false);
    expect(MeResponseSchema.safeParse(null).success).toBe(false);
    expect(MeResponseSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('parseMeResponse', () => {
  it('returns a Viewer for a valid operator payload', () => {
    const viewer = parseMeResponse({
      role: 'operator',
      displayName: 'Ops One',
      scopes: ['ops:read', 'kill_switch:read'],
    });
    expect(viewer).not.toBeNull();
    expect(viewer?.role).toBe('operator');
    expect(viewer?.displayName).toBe('Ops One');
    expect(viewer?.scopes).toEqual(['ops:read', 'kill_switch:read']);
    expect(viewer?.tenantId).toBeUndefined();
  });

  it('preserves tenantId for tenant role', () => {
    const viewer = parseMeResponse({
      role: 'tenant',
      tenantId: 'tenant_abc',
      scopes: ['tenant:read', 'tenant:write'],
    });
    expect(viewer?.role).toBe('tenant');
    expect(viewer?.tenantId).toBe('tenant_abc');
  });

  it('drops unknown scopes but keeps known ones', () => {
    const viewer = parseMeResponse({
      role: 'admin',
      scopes: ['ops:read', 'not_a_real_scope', 'kill_switch:write', 42, null],
    });
    expect(viewer?.scopes).toEqual(['ops:read', 'kill_switch:write']);
  });

  it('returns null when tenant is missing tenantId', () => {
    expect(parseMeResponse({ role: 'tenant', scopes: ['tenant:read'] })).toBeNull();
  });

  it('returns null for unknown role', () => {
    expect(parseMeResponse({ role: 'god-mode', scopes: [] })).toBeNull();
  });

  it('returns null for non-object body', () => {
    expect(parseMeResponse(null)).toBeNull();
    expect(parseMeResponse(undefined)).toBeNull();
    expect(parseMeResponse('operator')).toBeNull();
    expect(parseMeResponse(42)).toBeNull();
  });

  it('returns null when scopes is not an array', () => {
    expect(
      parseMeResponse({ role: 'operator', scopes: 'ops:read' })
    ).toBeNull();
  });

  it('tolerates a completely missing scopes field', () => {
    const viewer = parseMeResponse({ role: 'exec' });
    expect(viewer?.role).toBe('exec');
    expect(viewer?.scopes).toEqual([]);
  });
});
