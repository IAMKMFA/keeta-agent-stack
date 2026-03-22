import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index';
import path from 'node:path';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const pool = new pg.Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const migrationsFolder = path.join(process.cwd(), 'infrastructure/migrations');
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log('Migrations complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
