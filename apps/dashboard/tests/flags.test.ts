import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { devViewerRole, isDashboardV2Enabled } from '../lib/flags';

const env = process.env as Record<string, string | undefined>;
const TOUCHED = ['DASHBOARD_V2_ENABLED', 'DASHBOARD_DEV_VIEWER_ROLE', 'NODE_ENV'] as const;
const snapshot: Partial<Record<(typeof TOUCHED)[number], string | undefined>> = {};

beforeEach(() => {
  for (const key of TOUCHED) {
    snapshot[key] = env[key];
    delete env[key];
  }
});

afterEach(() => {
  for (const key of TOUCHED) {
    const prev = snapshot[key];
    if (prev === undefined) {
      delete env[key];
    } else {
      env[key] = prev;
    }
  }
});

describe('isDashboardV2Enabled', () => {
  it('defaults to enabled when the env var is unset', () => {
    delete env.DASHBOARD_V2_ENABLED;
    expect(isDashboardV2Enabled()).toBe(true);
  });

  it('accepts "true" (case insensitive)', () => {
    env.DASHBOARD_V2_ENABLED = 'TRUE';
    expect(isDashboardV2Enabled()).toBe(true);
  });

  it('accepts "1"', () => {
    env.DASHBOARD_V2_ENABLED = '1';
    expect(isDashboardV2Enabled()).toBe(true);
  });

  it('treats any other string as disabled', () => {
    env.DASHBOARD_V2_ENABLED = 'false';
    expect(isDashboardV2Enabled()).toBe(false);
    env.DASHBOARD_V2_ENABLED = 'no';
    expect(isDashboardV2Enabled()).toBe(false);
  });
});

describe('requireV2Enabled', () => {
  const notFoundMock = vi.fn();
  beforeEach(() => {
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
    vi.resetModules();
    vi.doMock('next/navigation', () => ({ notFound: notFoundMock }));
  });
  afterEach(() => {
    vi.doUnmock('next/navigation');
  });

  it('calls notFound() when flag is off', async () => {
    env.DASHBOARD_V2_ENABLED = 'false';
    const mod = await import('../lib/flags.js');
    expect(() => mod.requireV2Enabled()).toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('does not call notFound() when flag is on', async () => {
    env.DASHBOARD_V2_ENABLED = 'true';
    const mod = await import('../lib/flags.js');
    expect(() => mod.requireV2Enabled()).not.toThrow();
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});

describe('devViewerRole', () => {
  it('returns null in production regardless of env', () => {
    env.NODE_ENV = 'production';
    env.DASHBOARD_DEV_VIEWER_ROLE = 'admin';
    expect(devViewerRole()).toBeNull();
  });

  it('returns the role when set to a known role', () => {
    env.NODE_ENV = 'development';
    for (const role of ['admin', 'operator', 'tenant', 'exec']) {
      env.DASHBOARD_DEV_VIEWER_ROLE = role;
      expect(devViewerRole()).toBe(role);
    }
  });

  it('rejects unknown roles', () => {
    env.NODE_ENV = 'development';
    env.DASHBOARD_DEV_VIEWER_ROLE = 'superadmin';
    expect(devViewerRole()).toBeNull();
  });

  it('returns null when the env var is missing', () => {
    env.NODE_ENV = 'development';
    delete env.DASHBOARD_DEV_VIEWER_ROLE;
    expect(devViewerRole()).toBeNull();
  });
});
