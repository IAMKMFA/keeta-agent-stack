import pg from 'pg';
import { Redis } from 'ioredis';
import { runUpMigrations } from '@keeta-agent-stack/storage';

export interface IntegrationRuntimeConfig {
  adminDatabaseUrl: string;
  redisUrl: string;
  opsApiKey: string;
  databaseName: string;
}

export function shouldRunIntegrationTests(): boolean {
  return process.env.RUN_INTEGRATION_TESTS === 'true';
}

export function getIntegrationRuntimeConfig(): IntegrationRuntimeConfig {
  const baseDatabaseUrl =
    process.env.INTEGRATION_DATABASE_URL ?? 'postgresql://keeta:keeta@localhost:5432/keeta_agent';
  const adminDatabaseUrl = process.env.INTEGRATION_ADMIN_DATABASE_URL ?? buildAdminDatabaseUrl(baseDatabaseUrl);

  return {
    adminDatabaseUrl,
    redisUrl: process.env.INTEGRATION_REDIS_URL ?? 'redis://localhost:6379/15',
    opsApiKey: process.env.INTEGRATION_OPS_API_KEY ?? 'integration-ops-key',
    databaseName:
      process.env.INTEGRATION_DATABASE_NAME ??
      `keeta_integration_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`.replace(/[^a-z0-9_]/gi, '_'),
  };
}

function buildAdminDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

function databaseUrlForName(adminDatabaseUrl: string, databaseName: string): string {
  const url = new URL(adminDatabaseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export async function createIsolatedDatabase(config: IntegrationRuntimeConfig): Promise<{
  databaseUrl: string;
  cleanup: () => Promise<void>;
}> {
  const adminClient = new pg.Client({ connectionString: config.adminDatabaseUrl });
  await adminClient.connect();

  try {
    await adminClient.query(`CREATE DATABASE "${config.databaseName}"`);
  } catch (error) {
    await adminClient.end();
    throw error;
  }

  await adminClient.end();

  const databaseUrl = databaseUrlForName(config.adminDatabaseUrl, config.databaseName);
  await runUpMigrations(databaseUrl);

  return {
    databaseUrl,
    cleanup: async () => {
      const cleanupClient = new pg.Client({ connectionString: config.adminDatabaseUrl });
      await cleanupClient.connect();
      await cleanupClient.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1
           AND pid <> pg_backend_pid()`,
        [config.databaseName]
      );
      await cleanupClient.query(`DROP DATABASE IF EXISTS "${config.databaseName}"`);
      await cleanupClient.end();
    },
  };
}

export async function prepareRedis(url: string): Promise<() => Promise<void>> {
  const redis = new Redis(url);
  await redis.flushdb();
  await redis.quit();

  return async () => {
    const cleanupRedis = new Redis(url);
    await cleanupRedis.flushdb();
    await cleanupRedis.quit();
  };
}

export function applyIntegrationEnv(overrides: Record<string, string | undefined>): () => void {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

export async function waitFor<T>(
  description: string,
  fn: () => Promise<T | null | undefined>,
  options: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const intervalMs = options.intervalMs ?? 200;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await fn();
    if (result !== null && result !== undefined) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${description}`);
}
