import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { exportJWK, SignJWT } from 'jose';
import { afterEach, describe, expect, it } from 'vitest';
import { createIntegrationTestRuntime } from './harness.js';
import { shouldRunIntegrationTests } from './support.js';

const integration = shouldRunIntegrationTests() ? describe : describe.skip;

let activeRuntime: Awaited<ReturnType<typeof createIntegrationTestRuntime>> | undefined;
let activeAuthority: Awaited<ReturnType<typeof createRemoteJwtAuthority>> | undefined;

async function createRemoteJwtAuthority() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicJwk = await exportJWK(publicKey);
  const kid = 'integration-remote-jwks';
  publicJwk.kid = kid;
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  let issuer = '';
  const server: Server = createServer((req, res) => {
    if (req.url === '/.well-known/openid-configuration') {
      const body = JSON.stringify({
        issuer,
        jwks_uri: `${issuer}/jwks.json`,
        id_token_signing_alg_values_supported: ['RS256'],
      });
      res.setHeader('content-type', 'application/json');
      res.statusCode = 200;
      res.end(body);
      return;
    }

    if (req.url === '/jwks.json') {
      const body = JSON.stringify({ keys: [publicJwk] });
      res.setHeader('content-type', 'application/json');
      res.statusCode = 200;
      res.end(body);
      return;
    }

    res.statusCode = 404;
    res.end('not found');
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Remote JWT authority did not expose a TCP port');
  }

  issuer = `http://127.0.0.1:${address.port}`;

  return {
    issuer,
    jwksUrl: `${issuer}/jwks.json`,
    discoveryUrl: `${issuer}/.well-known/openid-configuration`,
    issueJwt: async (role: 'viewer' | 'operator' | 'admin' = 'viewer') =>
      new SignJWT({ roles: [role] })
        .setProtectedHeader({ alg: 'RS256', kid })
        .setSubject(`remote-${role}`)
        .setIssuer(issuer)
        .setAudience('keeta-agent-stack')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(privateKey),
    close: async () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  };
}

afterEach(async () => {
  await activeRuntime?.close();
  activeRuntime = undefined;
  await activeAuthority?.close();
  activeAuthority = undefined;
});

integration('jwt auth and rbac', () => {
  it('allows viewer reads but blocks viewer writes', async () => {
    activeRuntime = await createIntegrationTestRuntime({
      envOverrides: {
        OPS_API_KEY: undefined,
        AUTH_JWT_SECRET: 'integration-jwt-secret',
        AUTH_JWT_ISSUER: 'integration-tests',
        AUTH_JWT_AUDIENCE: 'keeta-agent-stack',
      },
    });

    const viewerToken = await activeRuntime.issueJwt('viewer');

    const listResponse = await activeRuntime.app.inject({
      method: 'GET',
      url: '/wallets',
      headers: {
        authorization: `Bearer ${viewerToken}`,
      },
    });
    expect(listResponse.statusCode).toBe(200);

    const createResponse = await activeRuntime.app.inject({
      method: 'POST',
      url: '/wallets/import',
      headers: {
        authorization: `Bearer ${viewerToken}`,
      },
      payload: {
        label: 'Viewer Wallet',
        address: 'keeta_viewer_wallet',
      },
    });
    expect(createResponse.statusCode).toBe(403);
    expect(JSON.parse(createResponse.body)).toMatchObject({
      error: {
        code: 'FORBIDDEN',
      },
    });

    const createGeneratedResponse = await activeRuntime.app.inject({
      method: 'POST',
      url: '/wallets',
      headers: {
        authorization: `Bearer ${viewerToken}`,
      },
      payload: {
        label: 'Viewer Generated Wallet',
      },
    });
    expect(createGeneratedResponse.statusCode).toBe(403);

    const createOrImportResponse = await activeRuntime.app.inject({
      method: 'POST',
      url: '/wallets/import-or-create',
      headers: {
        authorization: `Bearer ${viewerToken}`,
      },
      payload: {
        mode: 'import',
        label: 'Viewer Import Wallet',
        address: 'keeta_viewer_import_wallet',
      },
    });
    expect(createOrImportResponse.statusCode).toBe(403);
  });

  it('allows operator writes but reserves admin-only routes for admins', async () => {
    activeRuntime = await createIntegrationTestRuntime({
      envOverrides: {
        OPS_API_KEY: undefined,
        AUTH_JWT_SECRET: 'integration-jwt-secret',
        AUTH_JWT_ISSUER: 'integration-tests',
        AUTH_JWT_AUDIENCE: 'keeta-agent-stack',
      },
    });

    const operatorToken = await activeRuntime.issueJwt('operator');
    const adminToken = await activeRuntime.issueJwt('admin');
    const strategy = await activeRuntime.createStrategy({ name: 'Auth Test Strategy' });
    const strategyId = strategy.id;

    const walletResponse = await activeRuntime.app.inject({
      method: 'POST',
      url: '/wallets',
      headers: {
        authorization: `Bearer ${operatorToken}`,
      },
      payload: {
        label: 'Operator Wallet',
        includeSeed: false,
      },
    });
    expect(walletResponse.statusCode).toBe(201);

    const walletImportOrCreateResponse = await activeRuntime.app.inject({
      method: 'POST',
      url: '/wallets/import-or-create',
      headers: {
        authorization: `Bearer ${operatorToken}`,
      },
      payload: {
        mode: 'import',
        label: 'Operator Imported Wallet',
        address: `keeta_${randomUUID().replace(/-/g, '')}`,
      },
    });
    expect(walletImportOrCreateResponse.statusCode).toBe(201);

    const blockedPause = await activeRuntime.app.inject({
      method: 'POST',
      url: `/ops/strategies/${strategyId}/pause`,
      headers: {
        authorization: `Bearer ${operatorToken}`,
      },
    });
    expect(blockedPause.statusCode).toBe(403);

    const blockedPolicyPackCreate = await activeRuntime.app.inject({
      method: 'POST',
      url: '/policy/packs',
      headers: {
        authorization: `Bearer ${operatorToken}`,
      },
      payload: {
        name: 'Operator Policy Pack',
        rules: [],
        compositions: [],
      },
    });
    expect(blockedPolicyPackCreate.statusCode).toBe(403);

    const blockedStrategyPolicyPack = await activeRuntime.app.inject({
      method: 'PUT',
      url: `/ops/strategies/${strategyId}/policy-pack`,
      headers: {
        authorization: `Bearer ${operatorToken}`,
      },
      payload: {
        policyPackId: randomUUID(),
      },
    });
    expect(blockedStrategyPolicyPack.statusCode).toBe(403);

    const allowedPause = await activeRuntime.app.inject({
      method: 'POST',
      url: `/ops/strategies/${strategyId}/pause`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(allowedPause.statusCode).toBe(204);

    const allowedPolicyPackCreate = await activeRuntime.app.inject({
      method: 'POST',
      url: '/policy/packs',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Admin Policy Pack',
        rules: [],
        compositions: [],
      },
    });
    expect(allowedPolicyPackCreate.statusCode).toBe(201);

    const createdPack = JSON.parse(allowedPolicyPackCreate.body) as { id: string };
    const allowedStrategyPolicyPack = await activeRuntime.app.inject({
      method: 'PUT',
      url: `/ops/strategies/${strategyId}/policy-pack`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        policyPackId: createdPack.id,
      },
    });
    expect(allowedStrategyPolicyPack.statusCode).toBe(200);
  });

  it('accepts remotely verified tokens from a direct JWKS URL', async () => {
    activeAuthority = await createRemoteJwtAuthority();
    activeRuntime = await createIntegrationTestRuntime({
      envOverrides: {
        OPS_API_KEY: undefined,
        AUTH_JWT_SECRET: undefined,
        AUTH_JWT_PUBLIC_KEY_PEM: undefined,
        AUTH_JWT_JWKS_URL: activeAuthority.jwksUrl,
        AUTH_JWT_ISSUER: activeAuthority.issuer,
        AUTH_JWT_AUDIENCE: 'keeta-agent-stack',
      },
    });

    const operatorToken = await activeAuthority.issueJwt('operator');

    const response = await activeRuntime.app.inject({
      method: 'POST',
      url: '/wallets/import',
      headers: {
        authorization: `Bearer ${operatorToken}`,
      },
      payload: {
        label: 'Remote Jwks Wallet',
        address: `keeta_${randomUUID().replace(/-/g, '')}`,
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('accepts remotely verified tokens through OIDC discovery metadata', async () => {
    activeAuthority = await createRemoteJwtAuthority();
    activeRuntime = await createIntegrationTestRuntime({
      envOverrides: {
        OPS_API_KEY: undefined,
        AUTH_JWT_SECRET: undefined,
        AUTH_JWT_PUBLIC_KEY_PEM: undefined,
        AUTH_JWT_OIDC_DISCOVERY_URL: activeAuthority.discoveryUrl,
        AUTH_JWT_AUDIENCE: 'keeta-agent-stack',
      },
    });

    const viewerToken = await activeAuthority.issueJwt('viewer');

    const response = await activeRuntime.app.inject({
      method: 'GET',
      url: '/wallets',
      headers: {
        authorization: `Bearer ${viewerToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
  });
});
