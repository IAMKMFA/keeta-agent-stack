import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { resolveUrl } from './api';
import {
  ANONYMOUS_VIEWER,
  hasRole,
  hasScope,
  type Capability,
  type Role,
  type Viewer,
} from './permissions';
import { devViewerRole } from './flags';

const CAPABILITY_VALUES: readonly Capability[] = [
  'ops:read',
  'ops:write',
  'tenant:read',
  'tenant:write',
  'exec:read',
  'kill_switch:read',
  'kill_switch:write',
  'webhooks:read',
  'webhooks:write',
  'policy:read',
  'policy:write',
  'rails:read',
];

const CapabilitySchema = z.enum(CAPABILITY_VALUES as unknown as [Capability, ...Capability[]]);

/**
 * Validates the shape of a `GET /me` response from the upstream API.
 *
 * The schema is strict in two places that matter for security:
 * 1. `role` must be one of the four authenticated roles — anything else
 *    causes the viewer to fall back to `ANONYMOUS_VIEWER` (fail-closed).
 * 2. `tenantId` is required when `role === 'tenant'`. Without it, we have
 *    no way to enforce tenant scoping on downstream queries, so we refuse
 *    to construct a tenant viewer.
 *
 * Unknown capabilities in `scopes` are filtered out rather than rejecting
 * the entire response; the API may legitimately add new scopes that this
 * dashboard build doesn't understand yet.
 */
export const MeResponseSchema = z
  .object({
    role: z.enum(['admin', 'operator', 'tenant', 'exec']),
    displayName: z.string().optional(),
    tenantId: z.string().optional(),
    scopes: z.array(z.unknown()).optional(),
    authType: z.literal('jwt').optional(),
  })
  .refine(
    (val) =>
      val.role === 'tenant' ? typeof val.tenantId === 'string' && val.tenantId.length > 0 : true,
    {
      message: 'tenantId required for tenant role',
      path: ['tenantId'],
    }
  );

export type MeApiResponse = z.infer<typeof MeResponseSchema>;

/**
 * Parses a raw `/me` response body. Returns `null` on any validation failure
 * so callers fail closed by returning `ANONYMOUS_VIEWER`.
 */
export function parseMeResponse(raw: unknown): Viewer | null {
  const result = MeResponseSchema.safeParse(raw);
  if (!result.success) return null;
  const body = result.data;
  const rawScopes = Array.isArray(body.scopes) ? body.scopes : [];
  const scopes: Capability[] = [];
  for (const entry of rawScopes) {
    const parsed = CapabilitySchema.safeParse(entry);
    if (parsed.success) scopes.push(parsed.data);
  }
  const viewer: Viewer = {
    role: body.role,
    displayName: body.displayName,
    scopes,
  };
  if (body.role === 'tenant' && body.tenantId) viewer.tenantId = body.tenantId;
  return viewer;
}

const DEV_ROLE_DEFAULT_SCOPES: Record<'admin' | 'operator' | 'tenant' | 'exec', Capability[]> = {
  admin: [
    'ops:read',
    'ops:write',
    'tenant:read',
    'tenant:write',
    'exec:read',
    'kill_switch:read',
    'kill_switch:write',
    'webhooks:read',
    'webhooks:write',
    'policy:read',
    'policy:write',
    'rails:read',
  ],
  operator: [
    'ops:read',
    'ops:write',
    'exec:read',
    'kill_switch:read',
    'webhooks:read',
    'webhooks:write',
    'policy:read',
    'rails:read',
  ],
  tenant: ['tenant:read', 'tenant:write', 'webhooks:read', 'rails:read'],
  exec: ['exec:read', 'rails:read'],
};

async function forwardedAuthHeaders(): Promise<HeadersInit | null> {
  const hdrs = await headers();
  const cookieStore = await cookies();

  const authorization = hdrs.get('authorization');
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const out: Record<string, string> = {};
  if (authorization) out.authorization = authorization;
  if (cookieHeader) out.cookie = cookieHeader;
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Resolves the current viewer for this request. Request-scoped (via
 * React's cache()) so server components can call it multiple times
 * without re-fetching `/me`.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const devRole = devViewerRole();
  if (devRole) {
    const role = devRole as 'admin' | 'operator' | 'tenant' | 'exec';
    return {
      role,
      displayName:
        process.env.DASHBOARD_DEV_VIEWER_NAME ?? `${role[0]!.toUpperCase()}${role.slice(1)} (dev)`,
      scopes: DEV_ROLE_DEFAULT_SCOPES[role],
      ...(role === 'tenant'
        ? { tenantId: process.env.DASHBOARD_DEV_VIEWER_TENANT ?? 'tenant_dev' }
        : {}),
    };
  }

  const url = resolveUrl('/me');
  if (!url) return ANONYMOUS_VIEWER;

  const forwarded = await forwardedAuthHeaders();
  if (!forwarded) return ANONYMOUS_VIEWER;

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: forwarded,
    });
    if (!res.ok) return ANONYMOUS_VIEWER;
    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      return ANONYMOUS_VIEWER;
    }
    const parsed = parseMeResponse(raw);
    if (!parsed) return ANONYMOUS_VIEWER;
    return parsed;
  } catch {
    return ANONYMOUS_VIEWER;
  }
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer.role === 'anonymous') {
    redirect('/login');
  }
  return viewer;
}

export async function requireRole(roles: readonly Role[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer.role === 'anonymous') {
    redirect('/login');
  }
  if (!hasRole(viewer, roles)) {
    redirect('/forbidden');
  }
  return viewer;
}

export async function requireScope(scope: Capability): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer.role === 'anonymous') {
    redirect('/login');
  }
  if (!hasScope(viewer, scope)) {
    redirect('/forbidden');
  }
  return viewer;
}

export async function requireTenantAccess(tenantId: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer.role === 'anonymous') {
    redirect('/login');
  }
  if (viewer.role === 'admin' || viewer.role === 'operator') return viewer;
  if (viewer.role === 'tenant' && viewer.tenantId === tenantId) return viewer;
  redirect('/forbidden');
}

/**
 * Re-export the headers helper so route handlers can forward auth/cookies
 * when proxying to the upstream API.
 */
export { forwardedAuthHeaders };
