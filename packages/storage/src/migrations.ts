import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveMigrationsFolder() {
  return path.resolve(__dirname, '../../../infrastructure/migrations');
}

export async function runUpMigrations(databaseUrl: string) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  try {
    await migrate(db, { migrationsFolder: resolveMigrationsFolder() });
  } finally {
    await pool.end();
  }
}

export async function runDownMigrations(databaseUrl: string) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await pool.query(`
      DO $$
      DECLARE
        record_item RECORD;
      BEGIN
        FOR record_item IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
        LOOP
          EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', record_item.tablename);
        END LOOP;

        FOR record_item IN
          SELECT viewname
          FROM pg_views
          WHERE schemaname = 'public'
        LOOP
          EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', record_item.viewname);
        END LOOP;
      END
      $$;
    `);
  } finally {
    await pool.end();
  }
}
