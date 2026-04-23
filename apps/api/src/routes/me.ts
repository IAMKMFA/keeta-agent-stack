import type { FastifyPluginAsync } from 'fastify';
import type { JWTPayload } from 'jose';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey, type KeyLike } from 'jose';
import { createPublicKey } from 'node:crypto';

export type DashboardRole = 'admin' | 'operator' | 'tenant' | 'exec';

export type Capability =
  | 'ops:read'
  | 'ops:write'
  | 'tenant:read'
  | 'tenant:write'
  | 'exec:read'
  | 'kill_switch:read'
  | 'kill_switch:write'
  | 'webhooks:read'
  | 'webhooks:write'
  | 'policy:read'
  | 'policy:write'
  | 'rails:read';

export interface ViewerResponse {
  role: DashboardRole;
  displayName?: string;
  tenantId?: string;
  scopes: Capability[];
  authType: 'jwt';
}

const VALID_CAPABILITIES: Capability[] = [
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

function normalizeDashboardRole(value: unknown): DashboardRole | null {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();
  if (lowered === 'admin' || lowered === 'operator' || lowered === 'tenant' || lowered === 'exec') {
    return lowered;
  }
  return null;
}

function deriveDashboardRole(payload: JWTPayload): DashboardRole {
  const explicit = normalizeDashboardRole(payload.dashboard_role);
  if (explicit) return explicit;

  const baseRole = typeof payload.role === 'string' ? payload.role.toLowerCase() : '';
  if (baseRole === 'admin') return 'admin';
  if (baseRole === 'operator') return 'operator';

  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  const roleSet = new Set(
    roles.filter((r: unknown): r is string => typeof r === 'string').map((r) => r.toLowerCase())
  );
  if (roleSet.has('admin')) return 'admin';
  if (roleSet.has('operator')) return 'operator';
  if (roleSet.has('tenant')) return 'tenant';
  if (roleSet.has('exec')) return 'exec';

  return 'exec';
}

function extractScopes(payload: JWTPayload): Capability[] {
  const collected: string[] = [];

  if (Array.isArray(payload.scopes)) {
    for (const s of payload.scopes) {
      if (typeof s === 'string') collected.push(s);
    }
  }
  if (typeof payload.scope === 'string') {
    collected.push(...payload.scope.split(/\s+/).filter(Boolean));
  }

  const allowed = new Set<Capability>(VALID_CAPABILITIES);
  const out: Capability[] = [];
  const seen = new Set<string>();
  for (const raw of collected) {
    const normalized = raw.toLowerCase();
    if (allowed.has(normalized as Capability) && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized as Capability);
    }
  }
  return out;
}

function defaultScopesForRole(role: DashboardRole): Capability[] {
  switch (role) {
    case 'admin':
      return [
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
    case 'operator':
      return [
        'ops:read',
        'ops:write',
        'exec:read',
        'kill_switch:read',
        'webhooks:read',
        'webhooks:write',
        'policy:read',
        'rails:read',
      ];
    case 'tenant':
      return ['tenant:read', 'tenant:write', 'webhooks:read', 'rails:read'];
    case 'exec':
      return ['exec:read', 'rails:read'];
  }
}

function extractBearerToken(headerValue: unknown): string | null {
  if (typeof headerValue !== 'string') return null;
  const trimmed = headerValue.replace(/^Bearer\s+/i, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

type JwtVerifierKey = KeyLike | Uint8Array;

interface JwtVerifierConfig {
  key?: JwtVerifierKey;
  getKey?: JWTVerifyGetKey;
  issuer?: string;
}

let cachedPem: string | undefined;
let cachedKey: KeyLike | Uint8Array | undefined;
const remoteJwkSetCache = new Map<string, JWTVerifyGetKey>();

async function buildVerifier(
  env: Record<string, unknown>
): Promise<JwtVerifierConfig | null> {
  const secret = typeof env.AUTH_JWT_SECRET === 'string' ? env.AUTH_JWT_SECRET : undefined;
  const issuer = typeof env.AUTH_JWT_ISSUER === 'string' ? env.AUTH_JWT_ISSUER : undefined;
  const pem = typeof env.AUTH_JWT_PUBLIC_KEY_PEM === 'string' ? env.AUTH_JWT_PUBLIC_KEY_PEM : undefined;
  const jwksUrl = typeof env.AUTH_JWT_JWKS_URL === 'string' ? env.AUTH_JWT_JWKS_URL : undefined;
  if (secret) {
    return { key: new TextEncoder().encode(secret), issuer };
  }
  if (pem) {
    if (cachedPem !== pem) {
      cachedPem = pem;
      cachedKey = createPublicKey(pem);
    }
    const key = cachedKey;
    if (!key) return null;
    return { key, issuer };
  }
  if (jwksUrl) {
    let cached = remoteJwkSetCache.get(jwksUrl);
    if (!cached) {
      cached = createRemoteJWKSet(new URL(jwksUrl));
      remoteJwkSetCache.set(jwksUrl, cached);
    }
    return { getKey: cached, issuer };
  }
  return null;
}

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', async (req, reply) => {
    void reply.header('Cache-Control', 'no-store');

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const verifier = await buildVerifier(app.env as unknown as Record<string, unknown>).catch(
      (err) => {
        app.log.warn({ err }, '/me verifier initialization failed');
        return null;
      }
    );
    if (!verifier) {
      return reply.status(401).send({
        error: { code: 'UNAUTHORIZED', message: 'JWT authentication is not configured' },
      });
    }

    try {
      const verified = verifier.getKey
        ? await jwtVerify(token, verifier.getKey, verifier.issuer ? { issuer: verifier.issuer } : {})
        : await jwtVerify(
            token,
            verifier.key as JwtVerifierKey,
            verifier.issuer ? { issuer: verifier.issuer } : {}
          );

      const payload = verified.payload;
      const role = deriveDashboardRole(payload);
      let scopes = extractScopes(payload);
      if (scopes.length === 0) {
        scopes = defaultScopesForRole(role);
      }

      const tenantId =
        typeof payload.tenant_id === 'string'
          ? payload.tenant_id
          : typeof payload.tenantId === 'string'
            ? payload.tenantId
            : undefined;

      if (role === 'tenant' && !tenantId) {
        return reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Tenant identity missing tenant_id claim',
          },
        });
      }

      const displayName =
        typeof payload.name === 'string'
          ? payload.name
          : typeof payload.displayName === 'string'
            ? payload.displayName
            : undefined;

      const response: ViewerResponse = {
        role,
        ...(displayName ? { displayName } : {}),
        ...(role === 'tenant' && tenantId ? { tenantId } : {}),
        scopes,
        authType: 'jwt',
      };

      return response;
    } catch (err) {
      app.log.warn({ err }, '/me jwt verification failed');
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Invalid bearer token' } });
    }
  });
};
