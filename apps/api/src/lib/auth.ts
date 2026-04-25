import { createPublicKey } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
  type KeyLike,
} from 'jose';
import type { FastifyInstance } from 'fastify';

export type AuthRole = 'viewer' | 'operator' | 'admin';

export interface AuthPrincipal {
  authType: 'jwt' | 'ops-key' | 'admin-token';
  subject?: string;
  roles: AuthRole[];
  claims?: JWTPayload;
}

type AccessOptions = {
  anyOfRoles: AuthRole[];
  allowAdminBypassToken?: boolean;
};

const roleRank: Record<AuthRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

let cachedPem: string | undefined;
let cachedKey: KeyLike | Uint8Array | undefined;
const remoteJwkSetCache = new Map<string, JWTVerifyGetKey>();
const oidcDiscoveryCache = new Map<string, Promise<OidcDiscoveryDocument>>();

type JwtVerifierKey = KeyLike | Uint8Array;

interface JwtVerifierConfig {
  key?: JwtVerifierKey;
  getKey?: JWTVerifyGetKey;
  issuer?: string;
}

interface OidcDiscoveryDocument {
  issuer?: string;
  jwks_uri?: string;
}

function normalizeRole(value: string): AuthRole | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'viewer' || normalized.endsWith(':viewer')) return 'viewer';
  if (normalized === 'operator' || normalized.endsWith(':operator')) return 'operator';
  if (normalized === 'admin' || normalized.endsWith(':admin')) return 'admin';
  return undefined;
}

function uniqueRoles(roles: Array<AuthRole | undefined>): AuthRole[] {
  return [...new Set(roles.filter((role): role is AuthRole => Boolean(role)))];
}

function extractRoles(payload: JWTPayload): AuthRole[] {
  const fromRolesArray = Array.isArray(payload.roles)
    ? payload.roles
        .filter((entry: unknown): entry is string => typeof entry === 'string')
        .map((entry: string) => normalizeRole(entry))
    : [];
  const fromRoleClaim = typeof payload.role === 'string' ? [normalizeRole(payload.role)] : [];
  const fromScopeClaim =
    typeof payload.scope === 'string'
      ? payload.scope.split(/\s+/).map((entry: string) => normalizeRole(entry))
      : [];
  return uniqueRoles([...fromRolesArray, ...fromRoleClaim, ...fromScopeClaim]);
}

function hasRequiredRole(principal: AuthPrincipal, requiredRoles: AuthRole[]): boolean {
  const highestPrincipalRole =
    principal.roles.reduce<AuthRole | null>((highest, current) => {
      if (!highest) return current;
      return roleRank[current] > roleRank[highest] ? current : highest;
    }, null) ?? null;

  if (!highestPrincipalRole) return false;

  return requiredRoles.some(
    (requiredRole) => roleRank[highestPrincipalRole] >= roleRank[requiredRole]
  );
}

function extractBearerToken(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  return typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : undefined;
}

function extractOpsToken(req: FastifyRequest): string | undefined {
  const header = req.headers['x-ops-key'] ?? req.headers.authorization;
  return typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : undefined;
}

function extractAdminToken(req: FastifyRequest): string | undefined {
  const header = req.headers['x-admin-token'] ?? req.headers.authorization;
  return typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : undefined;
}

function jwtAudience(app: FastifyInstance): string | string[] | undefined {
  if (!app.env.AUTH_JWT_AUDIENCE || app.env.AUTH_JWT_AUDIENCE.length === 0) {
    return undefined;
  }
  return app.env.AUTH_JWT_AUDIENCE.length === 1
    ? app.env.AUTH_JWT_AUDIENCE[0]
    : app.env.AUTH_JWT_AUDIENCE;
}

function legacyOpsKeyAllowed(app: FastifyInstance): boolean {
  return app.env.NODE_ENV !== 'production' || app.env.AUTH_ALLOW_LEGACY_OPS_API_KEY === true;
}

/**
 * Role granted to a caller that authenticated via the legacy `x-ops-key` header.
 * Defaults to `operator` (least-privilege); admins must explicitly opt in with
 * `AUTH_LEGACY_OPS_API_KEY_ROLE=admin` (historical behavior).
 */
function legacyOpsKeyRole(app: FastifyInstance): AuthRole {
  return app.env.AUTH_LEGACY_OPS_API_KEY_ROLE ?? 'operator';
}

/**
 * Whether the admin bypass token is allowed to grant admin access in this environment.
 * In production, the bypass token is only accepted when `AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION`
 * is explicitly set to true; development/test always allow it when the token is configured.
 */
function adminBypassAllowed(app: FastifyInstance): boolean {
  if (app.env.NODE_ENV !== 'production') return true;
  return app.env.AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION === true;
}

function jwtRemoteTimeoutMs(app: FastifyInstance): number {
  return app.env.AUTH_JWT_REMOTE_TIMEOUT_MS;
}

function oidcDiscoveryUrl(app: FastifyInstance): string | undefined {
  if (app.env.AUTH_JWT_OIDC_DISCOVERY_URL) {
    return app.env.AUTH_JWT_OIDC_DISCOVERY_URL;
  }
  if (app.env.AUTH_JWT_OIDC_ISSUER) {
    return `${app.env.AUTH_JWT_OIDC_ISSUER.replace(/\/+$/, '')}/.well-known/openid-configuration`;
  }
  return undefined;
}

function getRemoteJwkSet(app: FastifyInstance, url: string) {
  const cacheKey = `${url}|${jwtRemoteTimeoutMs(app)}`;
  let cached = remoteJwkSetCache.get(cacheKey);
  if (!cached) {
    cached = createRemoteJWKSet(new URL(url), {
      timeoutDuration: jwtRemoteTimeoutMs(app),
    });
    remoteJwkSetCache.set(cacheKey, cached);
  }
  return cached;
}

async function fetchOidcDiscovery(
  app: FastifyInstance,
  url: string
): Promise<OidcDiscoveryDocument> {
  let cached = oidcDiscoveryCache.get(url);
  if (!cached) {
    cached = (async () => {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(jwtRemoteTimeoutMs(app)),
      });
      if (!response.ok) {
        throw new Error(`OIDC discovery request failed with ${response.status}`);
      }
      const payload = (await response.json()) as OidcDiscoveryDocument;
      if (!payload.jwks_uri) {
        throw new Error('OIDC discovery document is missing jwks_uri');
      }
      return payload;
    })();
    oidcDiscoveryCache.set(url, cached);
  }

  try {
    return await cached;
  } catch (error) {
    oidcDiscoveryCache.delete(url);
    throw error;
  }
}

async function jwtVerifierConfig(app: FastifyInstance): Promise<JwtVerifierConfig | undefined> {
  if (app.env.AUTH_JWT_SECRET) {
    return {
      key: new TextEncoder().encode(app.env.AUTH_JWT_SECRET),
      issuer: app.env.AUTH_JWT_ISSUER,
    };
  }
  if (app.env.AUTH_JWT_PUBLIC_KEY_PEM) {
    if (cachedPem !== app.env.AUTH_JWT_PUBLIC_KEY_PEM) {
      cachedPem = app.env.AUTH_JWT_PUBLIC_KEY_PEM;
      cachedKey = createPublicKey(app.env.AUTH_JWT_PUBLIC_KEY_PEM);
    }
    const key = cachedKey;
    if (!key) {
      return undefined;
    }
    return {
      key,
      issuer: app.env.AUTH_JWT_ISSUER,
    };
  }
  if (app.env.AUTH_JWT_JWKS_URL) {
    return {
      getKey: getRemoteJwkSet(app, app.env.AUTH_JWT_JWKS_URL),
      issuer: app.env.AUTH_JWT_ISSUER ?? app.env.AUTH_JWT_OIDC_ISSUER,
    };
  }

  const discoveryUrl = oidcDiscoveryUrl(app);
  if (!discoveryUrl) {
    return undefined;
  }

  const discovery = await fetchOidcDiscovery(app, discoveryUrl);
  return {
    getKey: getRemoteJwkSet(app, discovery.jwks_uri as string),
    issuer: app.env.AUTH_JWT_ISSUER ?? discovery.issuer ?? app.env.AUTH_JWT_OIDC_ISSUER,
  };
}

async function verifyJwtPrincipal(
  app: FastifyInstance,
  req: FastifyRequest
): Promise<AuthPrincipal | null> {
  const token = extractBearerToken(req);
  const verifier = await jwtVerifierConfig(app);
  if (!token || !verifier) return null;

  const verifyOptions = {
    ...(verifier.issuer ? { issuer: verifier.issuer } : {}),
    ...(jwtAudience(app) ? { audience: jwtAudience(app) } : {}),
  };
  const verified = verifier.getKey
    ? await jwtVerify(token, verifier.getKey, verifyOptions)
    : await jwtVerify(token, verifier.key as JwtVerifierKey, verifyOptions);
  const roles = extractRoles(verified.payload);

  return {
    authType: 'jwt',
    subject: typeof verified.payload.sub === 'string' ? verified.payload.sub : undefined,
    roles,
    claims: verified.payload,
  };
}

function unauthorized(reply: FastifyReply, message = 'Authentication required') {
  void reply.status(401).send({ error: { code: 'UNAUTHORIZED', message } });
  return false;
}

function forbidden(reply: FastifyReply, message = 'Insufficient role for this operation') {
  void reply.status(403).send({ error: { code: 'FORBIDDEN', message } });
  return false;
}

export async function authorizeRequest(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  options: AccessOptions
): Promise<AuthPrincipal | null> {
  try {
    const principal = await verifyJwtPrincipal(app, req);
    if (principal) {
      return hasRequiredRole(principal, options.anyOfRoles) ? principal : (forbidden(reply), null);
    }
  } catch (error) {
    app.log.warn({ err: error }, 'jwt verification failed');
    unauthorized(reply, 'Invalid bearer token');
    return null;
  }

  if (options.allowAdminBypassToken && app.env.ADMIN_BYPASS_TOKEN && adminBypassAllowed(app)) {
    const adminToken = extractAdminToken(req);
    if (adminToken && adminToken === app.env.ADMIN_BYPASS_TOKEN) {
      app.log.warn(
        { route: req.routeOptions?.url ?? req.url, ip: req.ip },
        'admin access granted via ADMIN_BYPASS_TOKEN — avoid in production'
      );
      return {
        authType: 'admin-token',
        roles: ['admin'],
      };
    }
  }

  if (app.env.OPS_API_KEY && legacyOpsKeyAllowed(app)) {
    const opsToken = extractOpsToken(req);
    if (opsToken && opsToken === app.env.OPS_API_KEY) {
      const role = legacyOpsKeyRole(app);
      if (!hasRequiredRole({ authType: 'ops-key', roles: [role] }, options.anyOfRoles)) {
        app.log.warn(
          {
            route: req.routeOptions?.url ?? req.url,
            ip: req.ip,
            grantedRole: role,
            required: options.anyOfRoles,
          },
          'legacy ops-key has insufficient role for this route'
        );
        forbidden(reply);
        return null;
      }
      return {
        authType: 'ops-key',
        roles: [role],
      };
    }
  }

  unauthorized(reply);
  return null;
}

export async function requireViewerAccess(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply
) {
  return authorizeRequest(app, req, reply, { anyOfRoles: ['viewer'] });
}

export async function requireOperatorAccess(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply
) {
  return authorizeRequest(app, req, reply, { anyOfRoles: ['operator'] });
}

export async function requireAdminAccess(
  app: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  options: { allowAdminBypassToken?: boolean } = {}
) {
  return authorizeRequest(app, req, reply, {
    anyOfRoles: ['admin'],
    allowAdminBypassToken: options.allowAdminBypassToken,
  });
}
