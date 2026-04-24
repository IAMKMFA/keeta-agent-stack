import { afterEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { runDownMigrations, runUpMigrations } from '@keeta-agent-stack/storage';
import { createIsolatedDatabase, getIntegrationRuntimeConfig, shouldRunIntegrationTests } from './support.js';

const integration = shouldRunIntegrationTests() ? describe : describe.skip;

let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

async function tableExists(databaseUrl: string, tableName: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{ regclass: string | null }>(
      'select to_regclass($1) as regclass',
      [`public.${tableName}`]
    );
    return result.rows[0]?.regclass !== null;
  } finally {
    await client.end();
  }
}

integration('migration rollback', () => {
  it(
    'supports full schema rollback and re-apply in an isolated database',
    async () => {
      const isolated = await createIsolatedDatabase(getIntegrationRuntimeConfig());
      cleanup = isolated.cleanup;

      expect(await tableExists(isolated.databaseUrl, 'execution_intents')).toBe(true);
      expect(await tableExists(isolated.databaseUrl, 'webhook_deliveries')).toBe(true);

      await runDownMigrations(isolated.databaseUrl);

      expect(await tableExists(isolated.databaseUrl, 'execution_intents')).toBe(false);
      expect(await tableExists(isolated.databaseUrl, 'webhook_deliveries')).toBe(false);

      await runUpMigrations(isolated.databaseUrl);

      expect(await tableExists(isolated.databaseUrl, 'execution_intents')).toBe(true);
      expect(await tableExists(isolated.databaseUrl, 'webhook_deliveries')).toBe(true);
    },
    30_000
  );
});
