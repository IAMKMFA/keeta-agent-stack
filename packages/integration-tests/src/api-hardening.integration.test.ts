import { afterEach, describe, expect, it } from 'vitest';
import { createIntegrationTestRuntime } from './harness.js';
import { shouldRunIntegrationTests } from './support.js';

const integration = shouldRunIntegrationTests() ? describe : describe.skip;

let activeRuntime: Awaited<ReturnType<typeof createIntegrationTestRuntime>> | undefined;

afterEach(async () => {
  await activeRuntime?.close();
  activeRuntime = undefined;
});

integration('api hardening', () => {
  it('echoes x-request-id headers', async () => {
    activeRuntime = await createIntegrationTestRuntime();

    const response = await activeRuntime.app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': 'req-keeta-hardening-test',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe('req-keeta-hardening-test');
  });

  it('rate limits repeated requests from the same client', async () => {
    activeRuntime = await createIntegrationTestRuntime({
      envOverrides: {
        API_RATE_LIMIT_MAX: '1',
        API_RATE_LIMIT_WINDOW_MS: '60000',
      },
    });

    const first = await activeRuntime.app.inject({
      method: 'GET',
      url: '/health',
      remoteAddress: '203.0.113.8',
    });
    const second = await activeRuntime.app.inject({
      method: 'GET',
      url: '/health',
      remoteAddress: '203.0.113.8',
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(JSON.parse(second.body)).toMatchObject({
      error: {
        code: 'RATE_LIMITED',
        message: expect.stringContaining('Rate limit exceeded'),
      },
    });
  });

  it('exposes authenticated prometheus metrics output', async () => {
    activeRuntime = await createIntegrationTestRuntime();

    const response = await activeRuntime.app.inject({
      method: 'GET',
      url: '/metrics',
      headers: activeRuntime.authHeaders('operator'),
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain('keeta_api_http_requests_total');
    expect(response.body).toContain('keeta_queue_depth');
    expect(response.body).toContain('keeta_policy_rejections_24h_total');
  });

  it('honors the explicit CORS origin allowlist', async () => {
    activeRuntime = await createIntegrationTestRuntime({
      envOverrides: {
        API_CORS_ORIGINS: 'https://dashboard.example',
      },
    });

    const allowed = await activeRuntime.app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        origin: 'https://dashboard.example',
      },
    });
    const denied = await activeRuntime.app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        origin: 'https://unknown.example',
      },
    });

    expect(allowed.statusCode).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://dashboard.example');
    expect(denied.statusCode).toBe(200);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('hides internal error messages in production responses', async () => {
    activeRuntime = await createIntegrationTestRuntime({
      envOverrides: {
        NODE_ENV: 'production',
      },
    });
    activeRuntime.app.get('/_test/internal-error', async () => {
      throw new Error('database password leaked');
    });

    const response = await activeRuntime.app.inject({
      method: 'GET',
      url: '/_test/internal-error',
      headers: {
        'x-request-id': 'req-prod-error-test',
      },
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
        requestId: 'req-prod-error-test',
      },
    });
    expect(response.body).not.toContain('database password leaked');
  });
});
